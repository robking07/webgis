// Static exports for the web app (D-02: viewing never depends on the database being awake):
//   apps/web/src/generated/registry.json      — validated registry entries
//   apps/web/src/generated/glossary.json      — plain-language explainers (glossary.yaml)
//   apps/web/src/generated/periods.json       — timeline stops exported per dataset (D-36)
//   apps/web/src/generated/relations.json     — how maps relate (relations.yaml, #156)
//   apps/web/src/generated/names.json         — state and county names (bundled for share cards, Specials)
//   data/tiles/values/<id>/<level>.json       — { geoid: value } for each dataset/level  ┐ published to R2 by
//   data/tiles/geo/{names,places,search}.json — names, map points, place search index   ┘ `ingest publish-data` (S2)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadGlossary, loadRegistry, loadRelations } from "@webgis/registry/load";
import { GeoLevel } from "@webgis/registry";
import { relationsExport } from "@webgis/registry/relations";
import { timelineStops } from "@webgis/registry/timeline";
import { cached, db, log, NAMES_JSON, ROOT, STATES, TILES } from "./util.ts";
import { readGazetteer } from "./geographies.ts";

const round = (v: number) => Number(v.toPrecision(4));
const LEVEL_FILE = new RegExp(`^(${GeoLevel.options.join("|")})\\.json$`);

export function exportRegistry() {
  const dir = join(ROOT, "apps/web/src/generated");
  mkdirSync(dir, { recursive: true });
  const entries = loadRegistry();
  writeFileSync(join(dir, "registry.json"), JSON.stringify(entries, null, 1));
  log("export", `registry.json: ${entries.length} datasets`);
  const glossary = loadGlossary();
  writeFileSync(join(dir, "glossary.json"), JSON.stringify(glossary, null, 1));
  log("export", `glossary.json: ${glossary.length} terms`);
  // Timeline stops whose values are on disk, with the levels each has, so the year control
  // only offers what was exported: { dataset: { stop: [levels] } }.
  const periods: Record<string, Record<string, string[]>> = {};
  for (const e of entries) {
    for (const s of timelineStops(e)) {
      const dir = join(TILES, "values", e.id, s.id);
      if (s.isDefault || !existsSync(dir)) continue;
      // Level files only: a stop folder also holds <level>.moe.json and us.json (#154, #156).
      const levels = readdirSync(dir).filter((f) => LEVEL_FILE.test(f)).map((f) => f.replace(/\.json$/, ""));
      if (levels.length) (periods[e.id] ??= {})[s.id] = levels;
    }
  }
  writeFileSync(join(dir, "periods.json"), JSON.stringify(periods, null, 1));
  // How maps relate (#156): groups, counts labels, parts sets and links, for Compare places.
  writeFileSync(join(dir, "relations.json"), JSON.stringify(relationsExport(loadRelations(entries)), null, 1));
  log("export", `periods.json: ${Object.values(periods).reduce((n, p) => n + Object.keys(p).length, 0)} timeline stops in ${Object.keys(periods).length} datasets`);
}

/** County names for chart tooltips (tracts and states get names from tiles on the map). */
export async function exportNames() {
  const pool = db();
  const { rows } = await pool.query<{ geoid: string; name: string; lon: number; lat: number }>(
    "select geoid, name, lon, lat from public.geographies where level in ('state','county')");
  const dir = join(TILES, "geo");
  mkdirSync(dir, { recursive: true });
  const names = JSON.stringify(Object.fromEntries(rows.map((r) => [r.geoid, r.name])));
  writeFileSync(join(dir, "names.json"), names);
  writeFileSync(NAMES_JSON, names);
  // Name + internal point, so tables and search can fly the map to a place.
  writeFileSync(join(dir, "places.json"), JSON.stringify(Object.fromEntries(rows.map((r) => [r.geoid, [r.name, +r.lon.toFixed(4), +r.lat.toFixed(4)]]))));
  log("export", `geo/names.json + places.json: ${rows.length} places`);
  await pool.end();
}

/** Place search index (D-35): states and counties (with their geoids, so search can select
 *  them on the map) plus every Gazetteer city, town and CDP. Rows are
 *  [name, kind, geoid | "", lon, lat, land sq mi]; the map picks a zoom from the land area. */
export async function exportSearch() {
  const pool = db();
  const { rows } = await pool.query<{ geoid: string; name: string; level: string; lon: number; lat: number; aland_sqmi: number }>(
    "select geoid, name, level, lon, lat, aland_sqmi from public.geographies where level in ('state','county')");
  await pool.end();
  const out: Array<[string, string, string, number, number, number]> = rows.map((r) => [
    r.name, r.level === "state" ? "State" : "County", r.geoid, +r.lon.toFixed(4), +r.lat.toFixed(4), Math.round(r.aland_sqmi)]);
  const places = await readGazetteer("2024_Gaz_place_national");
  // "Minneapolis city" → "Minneapolis, MN" (kind "City"); CDPs are labeled as communities.
  const KIND: Array<[RegExp, string]> = [[/ city$/, "City"], [/ town$/, "Town"], [/ village$/, "Village"], [/ borough$/, "Borough"], [/ CDP$/, "Community"], [/ municipality$/, "City"]];
  let n = 0;
  for (const p of places) {
    const usps = STATES[p.GEOID.slice(0, 2)]?.[1];
    if (!usps) continue;
    const k = KIND.find(([re]) => re.test(p.NAME));
    const name = k ? p.NAME.replace(k[0], "") : p.NAME;
    // Incorporated places carry their tagged code (issue #332: their own published numbers in areas/); CDPs none yet.
    out.push([`${name}, ${usps}`, k?.[1] ?? "Place", p.FUNCSTAT === "S" ? "" : `place${p.GEOID}`, +(+p.INTPTLONG).toFixed(4), +(+p.INTPTLAT).toFixed(4), Math.max(1, Math.round(+p.ALAND_SQMI))]);
    n++;
  }
  const dir = join(TILES, "geo");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "search.json"), JSON.stringify(out));
  // ZIP lookup: each ZCTA maps to the county holding most of its land (Census 2020 ZCTA-county relationship file).
  const rel = readFileSync(await cached("https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt"), "utf8").trim().split(/\r?\n/).slice(1);
  const best: Record<string, [string, number]> = {};
  for (const l of rel) {
    const c = l.split("|"), zip = c[1], area = +c[16];
    if (zip && (!best[zip] || area > best[zip][1])) best[zip] = [c[9], area];
  }
  writeFileSync(join(dir, "zips.json"), JSON.stringify(Object.fromEntries(Object.entries(best).map(([z, [g]]) => [z, g]))));
  log("export", `geo/zips.json: ${Object.keys(best).length} ZIP codes`);
  log("export", `geo/search.json: ${rows.length} states/counties + ${n} cities, towns and communities`);
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
    const dir = join(TILES, "values", dataset_id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${level}.json`), JSON.stringify(out));
    log("export", `${dataset_id}/${level}.json: ${rows.length} values`);
  }
  await pool.end();
}
