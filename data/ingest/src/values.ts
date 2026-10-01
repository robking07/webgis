// Writing a dataset: mirror the registry entry, then replace its values per level.
import type pg from "pg";
import type { DatasetEntry } from "@webgis/registry";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { log, upsert, WEB_DATA } from "./util.ts";

export type Level = "state" | "county" | "tract";
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

/** Replace all values of one dataset at one level. Rows whose geoid isn't in `geographies` are dropped and counted. */
export async function writeValues(pool: pg.Pool, datasetId: string, level: Level, values: Map<string, Value>) {
  const known = new Set((await pool.query<{ geoid: string }>("select geoid from public.geographies where level = $1", [level])).rows.map((r) => r.geoid));
  const rows: unknown[][] = [];
  let unmatched = 0;
  for (const [geoid, v] of values) {
    if (!known.has(geoid)) { unmatched++; continue; }
    rows.push([datasetId, level, geoid, v.value, v.moe]);
  }
  await pool.query("delete from public.dataset_values where dataset_id = $1 and level = $2", [datasetId, level]);
  await upsert(pool, "public.dataset_values", ["dataset_id", "level", "geoid", "value", "moe"], ["dataset_id", "level", "geoid"], rows);
  const nulls = rows.filter((r) => r[3] == null).length;
  log(datasetId, `${level}: ${rows.length} rows (${nulls} null)${unmatched ? `, ${unmatched} geoids not in geographies (dropped)` : ""}`);
  return { rows: rows.length, unmatched };
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
  const dir = join(WEB_DATA, "values", datasetId, stop);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${level}.json`), JSON.stringify(out));
  log(datasetId, `${stop} ${level}: ${Object.keys(out).length} values (web export only)`);
}

/** Read back a timeline stop written by writeStopValues (e.g. a population denominator). */
export function readStopValues(datasetId: string, stop: string, level: Level): Map<string, number> {
  const path = join(WEB_DATA, "values", datasetId, stop, `${level}.json`);
  if (!existsSync(path)) throw new Error(`${datasetId} ${stop} ${level} isn't exported yet (run its timeline ingest first)`);
  return new Map(Object.entries(JSON.parse(readFileSync(path, "utf8")) as Record<string, number>));
}
