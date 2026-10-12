// Main-thread cost of a level's values first loading (issue #28), before and after the values worker.
// node scripts/bench-block-groups.mts [values file or URL] [ramp] [classes]
// Default: census2020_pop_density block groups from https://tiles.mapwich.org (viridis, 7 quantiles).
// "Before" is the pre-#28 path (JSON.parse, classifyUnivariate with Object.values/entries, packing in
// MapView); "after" is what's left on the main thread: receiving the worker's reply (structured clone,
// measured with node:v8, which is the same serializer), splitting the geoids, the slices that build the
// values object and class map, and building the per-state expressions from the packed classes.
// MapLibre's own setPaintProperty work is the same in both and not counted.
import { readFileSync } from "node:fs";
import { deserialize, serialize } from "node:v8";
import { choroplethFillsByState, classifyValues, classify, classOf, packByState, rampColors, RAMPS, type RampId } from "../packages/design/src/index.ts";

const src = process.argv[2] ?? "https://tiles.mapwich.org/values/census2020_pop_density/block_group.json";
const sym = { ramp: process.argv[3] ?? "viridis", classification: "quantile" as const, classes: Number(process.argv[4] ?? 7) };
const text = src.startsWith("http") ? await (await fetch(src)).text() : readFileSync(src, "utf8");
const ms = (f: () => unknown) => { const a = performance.now(); const r = f(); return [performance.now() - a, r] as const; };
const med = (xs: number[]) => xs.sort((a, b) => a - b)[xs.length >> 1];

function before() {
  const [parse, values] = ms(() => JSON.parse(text) as Record<string, number>);
  const [cls, classed] = ms(() => {
    // classifyUnivariate as it was before #28.
    const r = RAMPS[sym.ramp as RampId];
    const n = Math.min(Math.max(sym.classes, r.minClasses), r.maxClasses);
    const breaks = classify(Object.values(values), { method: sym.classification, classes: n });
    const colors = rampColors(sym.ramp as RampId, breaks.length + 1);
    const out = new Map<string, number>();
    let min = Infinity;
    for (const v of Object.values(values)) if (v < min) min = v;
    for (const [g, v] of Object.entries(values)) out.set(g, classOf(v, breaks));
    return { colors, classes: out };
  });
  const [paint] = ms(() => choroplethFillsByState("block_group", classed.colors, classed.classes, "light"));
  return { parse, classify: cls, paint, total: parse + cls + paint, longest: Math.max(parse, cls, paint), classed };
}

function after() {
  // Worker side (off the main thread): parse, classify, pack.
  const [worker, msg] = ms(() => {
    const values = JSON.parse(text) as Record<string, number>;
    const keys = Object.keys(values);
    const vals = Float64Array.from(keys, (k) => values[k]);
    const c = classifyValues(sym, vals);
    return { keys: keys.join(","), vals, classed: { ...c, packed: packByState(keys.map((k, i) => [k, c.cls[i]] as const), c.colors.length) } };
  });
  const wire = serialize(msg);
  const [receive, got] = ms(() => deserialize(wire) as typeof msg);
  const [split, keys] = ms(() => got.keys.split(","));
  const slices: number[] = [];
  const values: Record<string, number> = {};
  const classes = new Map<string, number>();
  for (let i = 0; i < keys.length; i += 20000) {
    slices.push(ms(() => {
      for (let j = i; j < Math.min(i + 20000, keys.length); j++) { values[keys[j]] = got.vals[j]; classes.set(keys[j], got.classed.cls[j]); }
    })[0]);
  }
  const [paint] = ms(() => choroplethFillsByState("block_group", got.classed.colors, classes, "light", "noData", got.classed.packed));
  return { worker, receive, split, slicesTotal: slices.reduce((a, b) => a + b, 0), slowestSlice: Math.max(...slices), paint, total: receive + split + slices.reduce((a, b) => a + b, 0) + paint, longest: Math.max(receive + split, ...slices, paint), classes, msg };
}

const runs = 5;
const b = Array.from({ length: runs }, before), a = Array.from({ length: runs }, after);
// Same colors either way.
const bc = b[0].classed.classes, ac = a[0].classes;
if (bc.size !== ac.size || [...bc].some(([g, c]) => ac.get(g) !== c)) throw new Error("classes differ");
const fill = (x: unknown) => JSON.stringify(x);
if (fill(choroplethFillsByState("block_group", b[0].classed.colors, bc, "light")) !== fill(choroplethFillsByState("block_group", a[0].msg.classed.colors, ac, "light", "noData", a[0].msg.classed.packed))) throw new Error("fills differ");

const row = (rs: Record<string, unknown>[], k: string) => med(rs.map((r) => r[k] as number)).toFixed(0).padStart(5);
console.log(`${src}: ${bc.size} areas, median of ${runs} runs, ms on the main thread`);
console.log(`before  parse ${row(b, "parse")}  classify ${row(b, "classify")}  pack+paint ${row(b, "paint")}  | total ${row(b, "total")}  longest task ${row(b, "longest")}`);
console.log(`after   receive ${row(a, "receive")}  split ${row(a, "split")}  slices ${row(a, "slicesTotal")} (slowest ${row(a, "slowestSlice")})  paint ${row(a, "paint")}  | total ${row(a, "total")}  longest task ${row(a, "longest")}`);
console.log(`        (worker thread: ${row(a, "worker")} ms, off the main thread)`);
console.log("colors and expressions: identical");
