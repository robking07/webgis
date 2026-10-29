// The counts behind each map and their margins of error (#156 task 2, #154), beside the existing
// value files, which stay as they are (D-257):
//   values/<id>/[<stop>/]<level>.moe.json   { geoid: moe } for state, county and tract (block groups
//                                            already had one at the default period, D-124)
//   values/<id>/<level>.counts.json         { geoid: [numerator, its MOE, denominator, its MOE] },
//                                            state and county, default period
//   values/counts/<level>/<county>.json     tracts and block groups: { <series id>: { <tract or
//                                            tract+block group code>: row } }, one file per county
//                                            like the old values/tracts/ (D-113), so a place needs one fetch
//   values/<id>/[<stop>/]us.json            { value, moe, counts }: the U.S. row
// A series is a map (relations.ts `countsSpec`) or a parts set's remainder (relations.yaml).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { log, TILES } from "./util.ts";
import type { Level, Value } from "./values.ts";

/** [numerator, numerator MOE, denominator, denominator MOE]; null where there is none. */
export type Counts = [number | null, number | null, number | null, number | null];
/** An estimate and its margin of error (90%, as the Census Bureau publishes them). */
export interface Est { e: number | null; m: number | null }
/** An ACS row: variable with E/M suffix → number (a Map works too, as in the tests). */
export type Row = { get(v: string): number | null | undefined };
/** Rows from one fetch share `index` and keep their numbers in one Float64Array (NaN = missing).
 *  As Maps, the national block-group table (~240k rows × ~310 variables) took over 4 GB, past
 *  Node's default heap, and stopped `ingest counts` before the other sources ran (#233). */
export class PackedRow {
  private index: Map<string, number>;
  private a: Float64Array;
  // No parameter properties: `node src/run.ts` only strips types.
  constructor(index: Map<string, number>) { this.index = index; this.a = new Float64Array(index.size).fill(NaN); }
  set(v: string, x: number | null) { this.a[this.index.get(v)!] = x ?? NaN; }
  get(v: string) {
    const i = this.index.get(v);
    return i === undefined ? undefined : Number.isNaN(this.a[i]) ? null : this.a[i];
  }
}
/** Puerto Rico: not part of the Census Bureau's U.S. totals (ACS `us`, 2020 Census, FARS, LODES). */
const PR = "72";

/** Sum of ACS variables. MOE = √Σ MOE² (ACS General Handbook, ch. 8); a missing MOE counts as 0
 *  (controlled cells). Null when any estimate is missing. */
export function sumVars(row: Row, vars: string[]): Est {
  let e = 0, m2 = 0;
  for (const v of vars) {
    const ev = row.get(`${v}E`), mv = row.get(`${v}M`);
    if (ev == null) return { e: null, m: null };
    e += ev;
    m2 += (mv ?? 0) ** 2;
  }
  return { e, m: Math.sqrt(m2) };
}

// Counts are whole numbers except averages (FARS deaths a year): one decimal at most. MOEs whole.
const count = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);
const moe = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? null : Math.round(v));

export function countsRow(num: Est, den?: Est | null): Counts {
  return [count(num.e), moe(num.m), den ? count(den.e) : null, den ? moe(den.m) : null];
}

/** What's left of `total` after `members`: total − Σ members, so the parts add up exactly. Its MOE
 *  comes from `direct`, the published cells that make up the remainder (tighter than √Σ MOE² of a
 *  difference). `mismatch` is true when `direct`'s estimate doesn't equal the difference (the ingest
 *  logs how often, a check that the variables in relations.yaml are the right ones). */
export function remainderRow(total: Est, members: Est[], direct: Est): { row: Counts; mismatch: boolean } {
  if (total.e == null || members.some((x) => x.e == null)) return { row: [null, null, count(total.e), moe(total.m)], mismatch: false };
  const left = total.e - members.reduce((a, x) => a + x.e!, 0);
  return { row: [count(Math.max(0, left)), moe(direct.m), count(total.e), moe(total.m)], mismatch: direct.e != null && Math.abs(direct.e - left) > 0.5 };
}

/** The U.S. row from state rows (50 states + DC; Puerto Rico left out, as in Census U.S. totals).
 *  Null parts when any state lacks them; MOEs combine as √Σ MOE² (null for full counts). */
export function sumStates(rows: Map<string, Counts>): Counts {
  const states = [...rows].filter(([g]) => g.length === 2 && g !== PR).map(([, r]) => r);
  if (!states.length) return [null, null, null, null];
  const out: Counts = [null, null, null, null];
  for (const i of [0, 2] as const) {
    if (states.some((r) => r[i] == null)) continue;
    out[i] = count(states.reduce((a, r) => a + r[i]!, 0));
    const ms = states.map((r) => r[i + 1]);
    out[i + 1] = ms.some((m) => m != null) ? moe(Math.sqrt(ms.reduce<number>((a, m) => a + (m ?? 0) ** 2, 0))) : null;
  }
  return out;
}

/** Land area of the U.S. (states + DC, no Puerto Rico) from state areas, for density values. */
export function usArea(stateAreas: Map<string, number>): number {
  let a = 0;
  for (const [g, v] of stateAreas) if (g !== PR) a += v;
  return a;
}

const dirOf = (id: string, stop?: string | null, root = TILES) => join(root, "values", id, ...(stop ? [stop] : []));
const sig = (v: number) => Number(v.toPrecision(4));

/** values/<id>/[<stop>/]<level>.moe.json: the margins of a level, same shape as its values file. */
export function writeMoes(id: string, stop: string | null, level: Level, values: Map<string, Value>) {
  const out: Record<string, number> = {};
  for (const [g, v] of values) if (v.value != null && v.moe != null && Number.isFinite(v.moe)) out[g] = sig(v.moe);
  const dir = dirOf(id, stop);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${level}.moe.json`), JSON.stringify(out));
}

/** values/<id>/[<stop>/]us.json. */
export function writeUs(id: string, stop: string | null, v: Value, counts: Counts | null) {
  const dir = dirOf(id, stop);
  mkdirSync(dir, { recursive: true });
  const r = (x: number | null) => (x == null || !Number.isFinite(x) ? null : sig(x));
  writeFileSync(join(dir, "us.json"), JSON.stringify({ value: r(v.value), moe: r(v.moe), counts }));
}

const hasAny = (r: Counts) => r.some((x) => x != null);

/** Writes every series' counts for one level. State and county: one file per series. Tracts and
 *  block groups: merged into the per-county shards, replacing only these series (as the old
 *  tract-value writer did), so other series already in a shard stay. `root`: data/tiles (tests use a temp dir). */
export function writeCounts(level: Level, series: Map<string, Map<string, Counts>>, root = TILES) {
  if (level === "state" || level === "county") {
    for (const [id, rows] of series) {
      const out: Record<string, Counts> = {};
      for (const [g, r] of rows) if (hasAny(r)) out[g] = r;
      mkdirSync(dirOf(id, null, root), { recursive: true });
      writeFileSync(join(dirOf(id, null, root), `${level}.counts.json`), JSON.stringify(out));
      log(id, `${level}: ${Object.keys(out).length} counts`);
    }
    return;
  }
  if (level !== "tract" && level !== "block_group") return;
  const dir = join(root, "values", "counts", level);
  mkdirSync(dir, { recursive: true });
  const byCounty = new Map<string, Map<string, Record<string, Counts>>>();
  for (const [id, rows] of series) for (const [g, r] of rows) {
    if (!hasAny(r)) continue;
    const c = g.slice(0, 5);
    const s = byCounty.get(c) ?? byCounty.set(c, new Map()).get(c)!;
    (s.get(id) ?? s.set(id, {}).get(id)!)[g.slice(5)] = r;
  }
  const counties = new Set([...readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)), ...byCounty.keys()]);
  for (const c of counties) {
    const path = join(dir, `${c}.json`);
    const shard: Record<string, Record<string, Counts>> = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
    for (const id of series.keys()) delete shard[id];
    for (const [id, rows] of byCounty.get(c) ?? []) shard[id] = rows;
    if (!Object.keys(shard).length) { rmSync(path); continue; }
    writeFileSync(path, JSON.stringify(Object.fromEntries(Object.entries(shard).sort(([a], [b]) => a.localeCompare(b)))));
  }
  log("counts", `${level}: ${series.size} series in ${byCounty.size} county files`);
}
