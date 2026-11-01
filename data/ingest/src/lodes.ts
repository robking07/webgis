// LODES 8 ingest, driven by registry entries with `measure.kind: lodes`.
// Reads per-state Workplace (WAC) or Residence (RAC) Area Characteristics files at
// census-block level and aggregates to tract, county and state.
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, log, splitCsv, STATES } from "./util.ts";
import type { DatasetEntry } from "@webgis/registry";
import { timelineStops } from "@webgis/registry/timeline";
import { landArea, registerDataset, writeStopValues, writeValues, type Level, type Value } from "./values.ts";
import { sumStates, usArea, writeCounts, writeUs, type Counts } from "./counts.ts";

const BASE = "https://lehd.ces.census.gov/data/lodes/LODES8";
const LEN: Record<Level, number> = { state: 2, county: 5, tract: 11 };

async function stateFile(st: string, file: string, seg: string, jt: string, year: number, back: number): Promise<{ path: string; year: number } | null> {
  // Fall back up to `back` years when a state hasn't published the requested year.
  for (let y = year; y >= year - back; y--) {
    try {
      return { path: await cached(`${BASE}/${st}/${file}/${st}_${file}_${seg}_${jt}_${y}.csv.gz`), year: y };
    } catch { /* try an earlier year */ }
  }
  return null;
}

async function readBlocks(path: string, column: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const rl = createInterface({ input: createReadStream(path).pipe(createGunzip()) });
  let col = -1;
  for await (const line of rl) {
    const parts = line.split(",");
    if (col < 0) { col = parts.indexOf(column); if (col < 0) throw new Error(`${column} not in ${path}`); continue; }
    out.set(parts[0], (out.get(parts[0]) ?? 0) + +parts[col]);
  }
  return out;
}

/** Re-key blocks as <current tract code><block suffix> using the LODES crosswalk. */
async function remap(st: string, blocks: Map<string, number>): Promise<Map<string, number>> {
  const xw = await cached(`${BASE}/${st}/${st}_xwalk.csv.gz`);
  const rl = createInterface({ input: createReadStream(xw).pipe(createGunzip()) });
  let iBlk = -1, iTrct = -1;
  const out = new Map<string, number>();
  for await (const line of rl) {
    const p = splitCsv(line);
    if (iBlk < 0) { iBlk = p.indexOf("tabblk2020"); iTrct = p.indexOf("trct"); continue; }
    const n = blocks.get(p[iBlk]);
    if (n != null) { out.set(p[iTrct] + p[iBlk].slice(11), n); blocks.delete(p[iBlk]); }
  }
  if (blocks.size) throw new Error(`${st}_xwalk: ${blocks.size} blocks not in crosswalk`);
  return out;
}

type Pool = ReturnType<typeof db>;
interface Totals { jobs: Record<Level, Map<string, number>>; missingStates: Set<string> }

/** Jobs by state, county and tract for one year. `fallback`: use up to 3 earlier years for
 *  states that haven't published this one (the headline); a timeline year never does (D-36). */
async function totals(pool: Pool, e: DatasetEntry, year: number, fallback: boolean): Promise<Totals> {
  if (e.measure.kind !== "lodes") throw new Error("not lodes");
  const { file, segment, jobType, column } = e.measure;
  const jobs: Record<Level, Map<string, number>> = { state: new Map(), county: new Map(), tract: new Map() };
  const fallbacks: string[] = [];
  const missingStates = new Set<string>();
  const knownCounties = new Set((await pool.query<{ geoid: string }>("select geoid from public.geographies where level = 'county'")).rows.map((r) => r.geoid));
  for (const [fips, [, usps]] of Object.entries(STATES)) {
    if (fips === "72") continue; // LODES does not cover Puerto Rico
    const st = usps.toLowerCase();
    const f = await stateFile(st, file, segment, jobType, year, fallback ? 3 : 0);
    if (!f) { fallbacks.push(`${usps}: none${fallback ? ` since ${year - 3}` : ""}`); missingStates.add(fips); continue; }
    if (f.year !== year) fallbacks.push(`${usps}: ${f.year}`);
    let blocks = await readBlocks(f.path, column);
    // Block codes that predate current county codes (Connecticut's 2022 planning regions):
    // remap through the state's LODES crosswalk, which carries current cty/trct codes.
    if ([...blocks.keys()].some((b) => !knownCounties.has(b.slice(0, 5)))) {
      blocks = await remap(st, blocks);
      log(e.id, `${year} ${usps}: remapped blocks through ${st}_xwalk`);
    }
    for (const [code, n] of blocks) {
      for (const lvl of Object.keys(LEN) as Level[]) {
        const g = code.slice(0, LEN[lvl]);
        jobs[lvl].set(g, (jobs[lvl].get(g) ?? 0) + n);
      }
    }
  }
  if (fallbacks.length) log(e.id, `${year} year fallbacks/missing: ${fallbacks.join(", ")}`);
  return { jobs, missingStates };
}

async function levelValues(pool: Pool, e: DatasetEntry, t: Totals, level: Level): Promise<Map<string, Value>> {
  const perSqMi = e.measure.kind === "lodes" && e.measure.perSqMi;
  const areas = perSqMi ? await landArea(pool, level) : null;
  const values = new Map<string, Value>();
  // Every geography with land area gets a value; no jobs recorded = 0, not null.
  const geoids = areas ? [...areas.keys()] : [...t.jobs[level].keys()];
  for (const g of geoids) {
    if (g.startsWith("72")) continue;
    if (t.missingStates.has(g.slice(0, 2))) { values.set(g, { value: null, moe: null }); continue; }
    const jobs = t.jobs[level].get(g) ?? 0;
    const a = areas?.get(g);
    values.set(g, { value: perSqMi ? (a ? jobs / a : null) : jobs, moe: null });
  }
  if (areas) {
    const lost = [...t.jobs[level]].filter(([g]) => !areas.has(g)).reduce((a, [, n]) => a + n, 0);
    if (lost) log(e.id, `${level}: ${lost.toLocaleString()} jobs fall in geoids not in geographies (dropped)`);
  }
  return values;
}

export async function ingestLodes(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "lodes" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    await registerDataset(pool, e);
    const t = await totals(pool, e, +e.vintage, true);
    let us: Counts | null = null;
    for (const level of e.geographyLevels) {
      const values = await levelValues(pool, e, t, level);
      await writeValues(pool, e.id, level, values);
      // The counts behind the map (#156): jobs, for the same places (no data where a state is missing).
      const jobs = new Map([...values].map(([g, v]): [string, Counts] => [g, [t.missingStates.has(g.slice(0, 2)) ? null : t.jobs[level].get(g) ?? 0, null, null, null]]));
      writeCounts(level, new Map([[e.id, jobs]]));
      // States LODES doesn't publish (Alaska) stay out of the U.S. row, jobs and land area alike, so the density is still jobs per square mile of the places counted.
      if (level === "state") us = sumStates(new Map([...jobs].filter(([g]) => !t.missingStates.has(g))));
    }
    if (us) {
      const perSqMi = e.measure.kind === "lodes" && e.measure.perSqMi;
      writeUs(e.id, null, { value: us[0] == null ? null : perSqMi ? us[0] / usArea(new Map([...(await landArea(pool, "state"))].filter(([g]) => !t.missingStates.has(g)))) : us[0], moe: null }, us);
    }
  }
  await pool.end();
}

/** Earlier years (D-36), web export only. LODES 8 is on 2020 blocks for every year. */
export async function ingestLodesTimeline(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "lodes" && e.timeline && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    const headline = await totals(pool, e, +e.vintage, true);
    for (const s of timelineStops(e)) {
      if (s.isDefault) continue;
      const t = await totals(pool, e, +s.id, false);
      // Some early files exist but are nearly empty (Massachusetts 2010: a handful of jobs).
      // A state under 10% of its headline-year jobs is treated as not published.
      for (const [st, n] of t.jobs.state) {
        const h = headline.jobs.state.get(st);
        if (h && n < 0.1 * h) { t.missingStates.add(st); log(e.id, `${s.id} ${st}: ${n.toLocaleString()} jobs vs ${h.toLocaleString()} in ${e.vintage} → no data`); }
      }
      for (const level of e.geographyLevels) writeStopValues(e.id, s.id, level, await levelValues(pool, e, t, level));
    }
  }
  await pool.end();
}
