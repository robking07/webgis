// Static exports for the web app (D-02: viewing never depends on the database being awake):
//   apps/web/src/generated/registry.json      — validated registry entries
//   apps/web/public/data/values/<id>/<level>.json — { geoid: value } for each dataset/level
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadRegistry } from "@webgis/registry/load";
import { db, log, ROOT, WEB_DATA } from "./util.ts";

const round = (v: number) => Number(v.toPrecision(4));

export function exportRegistry() {
  const dir = join(ROOT, "apps/web/src/generated");
  mkdirSync(dir, { recursive: true });
  const entries = loadRegistry();
  writeFileSync(join(dir, "registry.json"), JSON.stringify(entries, null, 1));
  log("export", `registry.json: ${entries.length} datasets`);
}

/** County names for chart tooltips (tracts and states get names from tiles on the map). */
export async function exportNames() {
  const pool = db();
  const { rows } = await pool.query<{ geoid: string; name: string; lon: number; lat: number }>(
    "select geoid, name, lon, lat from public.geographies where level in ('state','county')");
  const dir = join(WEB_DATA, "geo");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "names.json"), JSON.stringify(Object.fromEntries(rows.map((r) => [r.geoid, r.name]))));
  // Name + internal point, so tables and search can fly the map to a place.
  writeFileSync(join(dir, "places.json"), JSON.stringify(Object.fromEntries(rows.map((r) => [r.geoid, [r.name, +r.lon.toFixed(4), +r.lat.toFixed(4)]]))));
  log("export", `geo/names.json + places.json: ${rows.length} places`);
  await pool.end();
}

export async function exportValues(only?: string[]) {
  const pool = db();
  const { rows: sets } = await pool.query<{ dataset_id: string; level: string }>(
    "select distinct dataset_id, level from public.dataset_values order by 1, 2");
  for (const { dataset_id, level } of sets) {
    if (only && !only.includes(dataset_id)) continue;
    const { rows } = await pool.query<{ geoid: string; value: number | null }>(
      "select geoid, value from public.dataset_values where dataset_id = $1 and level = $2 and value is not null", [dataset_id, level]);
    const out: Record<string, number> = {};
    for (const r of rows) out[r.geoid] = round(r.value!);
    const dir = join(WEB_DATA, "values", dataset_id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${level}.json`), JSON.stringify(out));
    log("export", `${dataset_id}/${level}.json: ${rows.length} values`);
  }
  await pool.end();
}
