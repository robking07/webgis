// State and county click details as static files (D-198, S1): the details panel and place pages
// read these instead of querying the database from every visitor's browser.
//   npm run ingest -- details             write data/tiles/details/<state fips>.json from the database
//   npm run ingest -- publish-details     upload them to R2 (details/<state fips>.json, gzip-encoded)
// One file per state holds the state and its counties: geography (name, centroid, land area) and
// every dataset's [value, moe]. Re-run both after any ingest that changes state or county values.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { db, log, TILES } from "./util.ts";

export const DETAILS_DIR = join(TILES, "details");

export interface PlaceDetail {
  name: string;
  lon: number;
  lat: number;
  aland_sqmi: number;
  /** dataset id → [value, moe], exactly as stored in the database (no rounding). */
  values: Record<string, [number | null, number | null]>;
}
/** One state's file: geoid (2-digit state, 5-digit counties) → detail. */
export type DetailShard = Record<string, PlaceDetail>;

interface GeoRow { geoid: string; level: string; name: string; state_fips: string; lon: number; lat: number; aland_sqmi: number }
interface ValueRow { dataset_id: string; geoid: string; value: number | null; moe: number | null }

/** Group geography and value rows into one shard per state. Pure, so it's unit-tested. */
export function buildShards(geos: GeoRow[], values: ValueRow[]): Map<string, DetailShard> {
  const shards = new Map<string, DetailShard>();
  const byGeoid = new Map<string, PlaceDetail>();
  for (const g of [...geos].sort((a, b) => a.geoid.localeCompare(b.geoid))) {
    if (g.level !== "state" && g.level !== "county") continue;
    const d: PlaceDetail = { name: g.name, lon: g.lon, lat: g.lat, aland_sqmi: g.aland_sqmi, values: {} };
    const s = g.geoid.slice(0, 2);
    (shards.get(s) ?? shards.set(s, {}).get(s)!)[g.geoid] = d;
    byGeoid.set(g.geoid, d);
  }
  for (const v of [...values].sort((a, b) => a.dataset_id.localeCompare(b.dataset_id))) {
    const d = byGeoid.get(v.geoid);
    if (d) d.values[v.dataset_id] = [v.value, v.moe];
  }
  return shards;
}

export async function detailsOut() {
  const pool = db();
  const { rows: geos } = await pool.query<GeoRow>(
    "select geoid, level, name, state_fips, lon, lat, aland_sqmi from public.geographies where level in ('state', 'county')");
  const { rows: values } = await pool.query<ValueRow>(
    "select dataset_id, geoid, value, moe from public.dataset_values where level in ('state', 'county')");
  await pool.end();
  const shards = buildShards(geos, values);
  rmSync(DETAILS_DIR, { recursive: true, force: true });
  mkdirSync(DETAILS_DIR, { recursive: true });
  let bytes = 0;
  for (const [s, shard] of shards) {
    const body = JSON.stringify(shard);
    writeFileSync(join(DETAILS_DIR, `${s}.json`), body);
    bytes += body.length;
  }
  const datasets = new Set(values.map((v) => v.dataset_id)).size;
  log("details", `${shards.size} files, ${geos.length} places, ${values.length} values from ${datasets} datasets (${(bytes / 1e6).toFixed(1)} MB raw)`);
}

export function detailFiles(): string[] {
  return readdirSync(DETAILS_DIR).filter((f) => f.endsWith(".json"));
}
