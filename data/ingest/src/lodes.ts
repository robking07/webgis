// LODES 8 ingest, driven by registry entries with `measure.kind: lodes`.
// Reads per-state Workplace (WAC) or Residence (RAC) Area Characteristics files at
// census-block level and aggregates to tract, county and state.
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, log, splitCsv, STATES } from "./util.ts";
import { landArea, registerDataset, writeValues, type Level, type Value } from "./values.ts";

const BASE = "https://lehd.ces.census.gov/data/lodes/LODES8";
const LEN: Record<Level, number> = { state: 2, county: 5, tract: 11 };

async function stateFile(st: string, file: string, seg: string, jt: string, year: number): Promise<{ path: string; year: number } | null> {
  // Fall back up to 3 years when a state hasn't published the requested year.
  for (let y = year; y > year - 4; y--) {
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

export async function ingestLodes(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "lodes" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "lodes") continue;
    const { file, segment, jobType, column, perSqMi } = e.measure;
    const year = +e.vintage;
    await registerDataset(pool, e);
    const totals: Record<Level, Map<string, number>> = { state: new Map(), county: new Map(), tract: new Map() };
    const fallbacks: string[] = [];
    const missingStates = new Set<string>();
    const knownCounties = new Set((await pool.query<{ geoid: string }>("select geoid from public.geographies where level = 'county'")).rows.map((r) => r.geoid));
    for (const [fips, [, usps]] of Object.entries(STATES)) {
      if (fips === "72") continue; // LODES does not cover Puerto Rico
      const st = usps.toLowerCase();
      const f = await stateFile(st, file, segment, jobType, year);
      if (!f) { fallbacks.push(`${usps}: none since ${year - 3}`); missingStates.add(fips); continue; }
      if (f.year !== year) fallbacks.push(`${usps}: ${f.year}`);
      let blocks = await readBlocks(f.path, column);
      // Block codes that predate current county codes (Connecticut's 2022 planning regions):
      // remap through the state's LODES crosswalk, which carries current cty/trct codes.
      if ([...blocks.keys()].some((b) => !knownCounties.has(b.slice(0, 5)))) {
        blocks = await remap(st, blocks);
        log(e.id, `${usps}: remapped blocks through ${st}_xwalk`);
      }
      for (const [code, n] of blocks) {
        for (const lvl of Object.keys(LEN) as Level[]) {
          const g = code.slice(0, LEN[lvl]);
          totals[lvl].set(g, (totals[lvl].get(g) ?? 0) + n);
        }
      }
    }
    if (fallbacks.length) log(e.id, `year fallbacks/missing: ${fallbacks.join(", ")}`);
    for (const level of e.geographyLevels) {
      const areas = perSqMi ? await landArea(pool, level) : null;
      const values = new Map<string, Value>();
      // Every geography with land area gets a value; no jobs recorded = 0, not null.
      const geoids = areas ? [...areas.keys()] : [...totals[level].keys()];
      for (const g of geoids) {
        if (g.startsWith("72")) continue;
        if (missingStates.has(g.slice(0, 2))) { values.set(g, { value: null, moe: null }); continue; }
        const jobs = totals[level].get(g) ?? 0;
        const a = areas?.get(g);
        values.set(g, { value: perSqMi ? (a ? jobs / a : null) : jobs, moe: null });
      }
      if (areas) {
        const lost = [...totals[level]].filter(([g]) => !areas.has(g)).reduce((a, [, n]) => a + n, 0);
        if (lost) log(e.id, `${level}: ${lost.toLocaleString()} jobs fall in geoids not in geographies (dropped)`);
      }
      await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
