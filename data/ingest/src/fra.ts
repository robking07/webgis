// FRA highway-rail grade crossing data (public domain, data.transportation.gov Socrata, no key), by
// state and county. Registry `measure.kind: fra_crossings` (#517). Only server-side counts are
// fetched (grouped by year and place), so no narratives, names or crossing locations are downloaded.
//   crashes:   Form 57 incidents (7wn6-i5b9) at public crossings, one per incident (joint code 1:
//              the first railroad's report; a second railroad's copy is code 2), 1975 on.
//   crossings: open public at-grade crossings in the current Form 71 inventory (m2f8-22s6).
// Counts are placed by FRA's state + county FIPS codes. A county with none is a real 0.
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadRegistry } from "@webgis/registry/load";
import { timelineStops } from "@webgis/registry/timeline";
import { CACHE, db, FIPS_RENAMES, log } from "./util.ts";
import { estimatedPop } from "./popest.ts";
import { registerDataset, writeStopValues, writeValues, type Value } from "./values.ts";
import { writeUs } from "./counts.ts";

type Row = Record<string, string | undefined>;
/** FIPS ("27", "27053") → count. */
export type Tally = Map<string, number>;
const LEVELS = ["state", "county"] as const;
const UA = "Mapwich-ingest/1.0 (+https://mapwich.org; educational, non-commercial)";
const PAGE = 50000;

/** One SoQL query, every page, kept in data/cache under a dated name (FRA revises in place). */
async function soql(dataset: string, params: Record<string, string>, name: string): Promise<Row[]> {
  const path = join(CACHE, `fra-${name}-${new Date().toISOString().slice(0, 10)}.json`);
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  const rows: Row[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const q = new URLSearchParams({ ...params, $limit: String(PAGE), $offset: String(offset) });
    const url = `https://data.transportation.gov/resource/${dataset}.json?${q}`;
    let page: Row[] | undefined;
    for (let attempt = 1; !page; attempt++) {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.status >= 500 && attempt < 4) { await new Promise((r) => setTimeout(r, 5000 * attempt)); continue; }
      if (res.status !== 200) throw new Error(`FRA ${dataset} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
      page = await res.json() as Row[];
    }
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, JSON.stringify(rows));
  return rows;
}

/** Form 57's two-digit incident year: 75–99 are the 1900s. */
const fullYear = (yy: string) => (+yy >= 75 ? 1900 : 2000) + +yy;

/** Grouped rows → per level tallies. `county` is the 3-digit code (crashes) or already 5 digits
 *  (inventory). Rows without a state are dropped; without a county, they count toward the state only. */
export function tally(rows: Row[]): { state: Tally; county: Tally } {
  const out = { state: new Map(), county: new Map() } as { state: Tally; county: Tally };
  const add = (m: Tally, g: string, n: number) => m.set(g, (m.get(g) ?? 0) + n);
  for (const r of rows) {
    const n = Number(r.n), c = r.countycode ?? "";
    const st = r.statecode ?? (c.length === 5 ? c.slice(0, 2) : "");
    if (!/^\d\d$/.test(st) || !(n > 0)) continue;
    add(out.state, st, n);
    const raw = c.length === 5 ? c : /^\d{3}$/.test(c) ? st + c : null;
    if (raw && !raw.endsWith("000")) add(out.county, FIPS_RENAMES[raw] ?? raw, n);
  }
  return out;
}

/** Count ÷ `nYears` for every place in `places` (0 where none). Counts under codes not in `places`
 *  (Connecticut's old counties on today's map, retired Alaska codes): if over 5% of a state's count,
 *  its counties would read falsely low, so they get no value instead (as fars.ts). */
export function countValues(t: { state: Tally; county: Tally }, level: "state" | "county", places: Iterable<string>, nYears: number, tag: string): Map<string, Value> {
  const out = new Map<string, Value>();
  for (const g of places) if (!g.startsWith("72")) out.set(g, { value: (t[level].get(g) ?? 0) / nYears, moe: null });
  const lost = new Map<string, number>();
  for (const [g, n] of t[level]) if (!out.has(g)) lost.set(g.slice(0, 2), (lost.get(g.slice(0, 2)) ?? 0) + n);
  for (const [st, n] of lost) {
    const share = n / (t.state.get(st) ?? n);
    if (share > 0.01) log("fra", `${tag} ${level}: ${n} under codes not on the map in ${st} (${(100 * share).toFixed(1)}%)${share > 0.05 ? " → its counties set to no data" : ""}`);
    if (share > 0.05) for (const g of out.keys()) if (g.startsWith(st)) out.set(g, { value: null, moe: null });
  }
  return out;
}

let crashMemo: Promise<Map<number, Row[]>> | undefined;
/** Incident year → grouped rows (incidents at public crossings by state and county). */
function crashes() {
  crashMemo ??= soql("7wn6-i5b9", {
    $select: "incidentyear, statecode, countycode, count(*) as n",
    $where: "railroadreporting='1' AND publicprivatecode='Y'",
    $group: "incidentyear, statecode, countycode",
    $order: "incidentyear, statecode, countycode",
  }, "form57-public-by-county").then((rows) => {
    const byYear = new Map<number, Row[]>();
    for (const r of rows) {
      if (!/^\d\d$/.test(r.incidentyear ?? "")) continue;
      const y = fullYear(r.incidentyear!);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(r);
    }
    return byYear;
  });
  return crashMemo;
}

async function crashTally(from: number, to: number) {
  const byYear = await crashes();
  const rows: Row[] = [];
  for (let y = from; y <= to; y++) {
    if (!byYear.has(y)) throw new Error(`FRA Form 57: no incidents for ${y}`);
    rows.push(...byYear.get(y)!);
  }
  return tally(rows);
}

const inventory = () => soql("m2f8-22s6", {
  $select: "countycode, count(*) as n",
  $where: "crossingtype='Public' AND crossingposition='At Grade' AND crossingclosed='No' AND reasondescription!='No Train Traffic'",
  $group: "countycode",
  $order: "countycode",
}, "form71-public-at-grade-by-county");

/** values/<id>/[<stop>/]us.json: the sum over the states (Puerto Rico left out). */
function writeUsCount(id: string, stop: string | null, state: Map<string, Value>) {
  const us = [...state.values()].reduce((a, v) => (a == null || v.value == null ? null : a + v.value), 0 as number | null);
  writeUs(id, stop, { value: us, moe: null }, [us, null, null, null]);
}

async function valuesFor(field: "crashes" | "crossings", from: number, to: number, level: "state" | "county", tag: string) {
  const t = field === "crashes" ? await crashTally(from, to) : tally(await inventory());
  // The Census estimates name the counties of that year's map: 2019 ones before 2020, today's after.
  return countValues(t, level, (await estimatedPop(field === "crashes" ? to : 2025, level)).keys(), to - from + 1, tag);
}

export async function ingestFra(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "fra_crossings" && (!only || only.includes(e.id)));
  if (!entries.length) return;
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "fra_crossings") continue;
    const [a, b] = e.measure.years ?? [0, 0];
    if (e.measure.field === "crashes" && !e.measure.years) throw new Error(`${e.id}: crashes needs measure.years`);
    await registerDataset(pool, e);
    for (const level of LEVELS) {
      const v = await valuesFor(e.measure.field, a, b, level, e.vintage);
      await writeValues(pool, e.id, level, v);
      if (level === "state") { writeUsCount(e.id, null, v); log(e.id, `${e.vintage}: U.S. ${[...v.values()].reduce((s, x) => s + (x.value ?? 0), 0).toLocaleString()}`); }
    }
  }
  await pool.end();
}

/** Year control (D-36): every incident year, web export only. */
export async function ingestFraTimeline(only?: string[]) {
  for (const e of loadRegistry().filter((e) => e.measure.kind === "fra_crossings" && e.timeline && (!only || only.includes(e.id)))) {
    if (e.measure.kind !== "fra_crossings") continue;
    for (const s of timelineStops(e)) {
      if (s.isDefault) continue;
      for (const level of LEVELS) {
        const v = await valuesFor(e.measure.field, +s.id, +s.id, level, s.id);
        writeStopValues(e.id, s.id, level, v);
        if (level === "state") writeUsCount(e.id, s.id, v);
      }
    }
  }
}
