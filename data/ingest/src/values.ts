// Writing a dataset: mirror the registry entry, then replace its values per level.
import type pg from "pg";
import type { DatasetEntry } from "@webgis/registry";
import { mkdirSync, writeFileSync } from "node:fs";
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

/** Block groups are too many for the free database (D-34): write static files directly,
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
