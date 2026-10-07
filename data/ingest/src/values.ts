// Writing a dataset: mirror the registry entry, then replace its values per level.
import type pg from "pg";
import type { DatasetEntry } from "@webgis/registry";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { log, TILES, upsert } from "./util.ts";

export type Level = "state" | "county" | "tract" | "block_group" | "block";
export interface Value { value: number | null; moe: number | null }

export async function registerDataset(pool: pg.Pool, e: DatasetEntry) {
  await pool.query(
    `insert into public.datasets (id, title, category, unit, vintage, entry, loaded_at)
     values ($1,$2,$3,$4,$5,$6, now())
     on conflict (id) do update set title = excluded.title, category = excluded.category, unit = excluded.unit,
       vintage = excluded.vintage, entry = excluded.entry, loaded_at = now()`,
    [e.id, e.title, e.category, e.unit, e.vintage, e],
  );
}

/** Replace all values of one dataset at one level. Rows whose geoid isn't in `geographies` are dropped and counted.
 *  Tract values skip the database (D-113): see writeTractValues. */
export async function writeValues(pool: pg.Pool, datasetId: string, level: Level, values: Map<string, Value>) {
  const known = new Set((await pool.query<{ geoid: string }>("select geoid from public.geographies where level = $1", [level])).rows.map((r) => r.geoid));
  const rows: unknown[][] = [];
  let unmatched = 0;
  for (const [geoid, v] of values) {
    if (!known.has(geoid)) { unmatched++; continue; }
    rows.push([datasetId, level, geoid, v.value, v.moe]);
  }
  await pool.query("delete from public.dataset_values where dataset_id = $1 and level = $2", [datasetId, level]);
  if (level === "tract") {
    writeTractValues(datasetId, new Map(rows.map((r) => [r[2] as string, { value: r[3] as number | null, moe: r[4] as number | null }])));
    const nulls = rows.filter((r) => r[3] == null).length;
    log(datasetId, `tract: ${rows.length} values (${nulls} null), files only${unmatched ? `, ${unmatched} geoids not in geographies (dropped)` : ""}`);
    return { rows: rows.length, unmatched };
  }
  await upsert(pool, "public.dataset_values", ["dataset_id", "level", "geoid", "value", "moe"], ["dataset_id", "level", "geoid"], rows);
  const nulls = rows.filter((r) => r[3] == null).length;
  log(datasetId, `${level}: ${rows.length} rows (${nulls} null)${unmatched ? `, ${unmatched} geoids not in geographies (dropped)` : ""}`);
  return { rows: rows.length, unmatched };
}

/** Block groups are too many for the free database (D-124): write static files directly,
 *  with MOEs in a side file the details panel loads on demand. They're ~5 MB each, so they
 *  live with the tiles (data/tiles/values, R2 via `publish-values`), not in git. */
export function writeStatic(datasetId: string, level: Level, values: Map<string, Value>) {
  const dir = join(TILES, "values", datasetId);
  mkdirSync(dir, { recursive: true });
  const round = (v: number) => Number(v.toPrecision(4));
  const vals: Record<string, number> = {}, moes: Record<string, number> = {};
  for (const [g, v] of values) {
    if (v.value == null) continue;
    vals[g] = round(v.value);
    if (v.moe != null) moes[g] = round(v.moe);
  }
  writeFileSync(join(dir, `${level}.json`), JSON.stringify(vals));
  writeFileSync(join(dir, `${level}.moe.json`), JSON.stringify(moes));
  log(datasetId, `${level}: ${Object.keys(vals).length} values (static only)`);
}

export async function landArea(pool: pg.Pool, level: Level): Promise<Map<string, number>> {
  const r = await pool.query<{ geoid: string; aland_sqmi: number }>("select geoid, aland_sqmi from public.geographies where level = $1", [level]);
  return new Map(r.rows.map((x) => [x.geoid, x.aland_sqmi]));
}

/** Timeline values (D-36) skip the database, which holds only the default period (free-tier
 *  budget), and go straight to the web export: values/<dataset>/<stop>/<level>.json. */
export function writeStopValues(datasetId: string, stop: string, level: Level, values: Map<string, Value>) {
  const out: Record<string, number> = {};
  for (const [g, v] of values) if (v.value != null && Number.isFinite(v.value)) out[g] = Number(v.value.toPrecision(4));
  const dir = join(TILES, "values", datasetId, stop);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${level}.json`), JSON.stringify(out));
  log(datasetId, `${stop} ${level}: ${Object.keys(out).length} values (web export only)`);
}

const round = (v: number | null, digits: number) => (v == null || !Number.isFinite(v) ? null : Number(v.toPrecision(digits)));
export const TRACT_DETAIL_DIR = join(TILES, "values", "tracts");
type TractShard = Record<string, Record<string, [number | null, number | null]>>;

/** Tract values live in static files, not the database (D-113: the free tier's 500 MB holds
 *  about a dozen tract datasets but hundreds of county ones). Two files:
 *  - values/<dataset>/tract.json, the map's colors (same shape as every other level);
 *  - values/tracts/<county fips>.json, every dataset's [value, moe] for that county's tracts,
 *    keyed by the 6-digit tract code, so a details panel needs one small fetch. */
export function writeTractValues(datasetId: string, values: Map<string, Value>) {
  const map: Record<string, number> = {};
  const byCounty = new Map<string, Record<string, [number | null, number | null]>>();
  for (const [g, v] of values) {
    const value = round(v.value, 4);
    if (value != null) map[g] = value;
    const c = g.slice(0, 5);
    (byCounty.get(c) ?? byCounty.set(c, {}).get(c)!)[g.slice(5)] = [value, round(v.moe, 3)];
  }
  const dir = join(TILES, "values", datasetId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "tract.json"), JSON.stringify(map));

  mkdirSync(TRACT_DETAIL_DIR, { recursive: true });
  const counties = new Set([...readdirSync(TRACT_DETAIL_DIR).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)), ...byCounty.keys()]);
  for (const c of counties) {
    const path = join(TRACT_DETAIL_DIR, `${c}.json`);
    const shard: TractShard = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
    delete shard[datasetId];
    const rows = byCounty.get(c);
    if (rows) shard[datasetId] = rows;
    if (!Object.keys(shard).length) { rmSync(path); continue; }
    // Sorted keys keep diffs small when one dataset is reloaded.
    writeFileSync(path, JSON.stringify(Object.fromEntries(Object.entries(shard).sort(([a], [b]) => a.localeCompare(b)))));
  }
}

/** Number of non-null tract values a dataset has in its map file (for docs). */
export function tractValueCount(datasetId: string): number | null {
  const path = join(TILES, "values", datasetId, "tract.json");
  return existsSync(path) ? Object.keys(JSON.parse(readFileSync(path, "utf8"))).length : null;
}

/** Read back a timeline stop written by writeStopValues (e.g. a population denominator). */
export function readStopValues(datasetId: string, stop: string, level: Level): Map<string, number> {
  const path = join(TILES, "values", datasetId, stop, `${level}.json`);
  if (!existsSync(path)) throw new Error(`${datasetId} ${stop} ${level} isn't exported yet (run its timeline ingest first)`);
  return new Map(Object.entries(JSON.parse(readFileSync(path, "utf8")) as Record<string, number>));
}
