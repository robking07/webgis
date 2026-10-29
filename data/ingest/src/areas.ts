// Cities and metro areas (issue #332): places to search for that carry the Census Bureau's own
// published ACS 5-year value and margin for the maps that opt in (registry `areaLevels`). Never a
// map level, so no tiles. Outlines: TIGERweb ACS 2024 layers (Census, public domain; Jan 1, 2024
// boundaries, the vintage the 2020–2024 ACS uses), simplified by the server. Writes one file per area,
// data/tiles/areas/<code>.json ({ v: { dataset: [value, moe] }, g: geometry, b: bbox }), plus
// areas/index.json (metro and micro search rows; city rows are in geo/search.json). Codes are tagged
// ("cbsa33460", "place2743000") so they can't be read as a county or tract GEOID.
// Run: npm run ingest -- areas   then   npm run ingest -- publish-areas
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { derive, fetchTable, varsOf } from "./acs.ts";
import { bboxOf } from "./mpo.ts";
import { log, STATES, TILES } from "./util.ts";
import type { Row } from "./counts.ts";

const TIGER = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2024/MapServer";
/** TIGERweb layer ids: metropolitan and micropolitan statistical areas, incorporated places. */
const LAYERS = { metro: 93, micro: 91, place: 28 } as const;
const PAGE = 1000;
const OUT = join(TILES, "areas");

type Geom = { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
type Feature = { properties: { GEOID: string; NAME: string; AREALAND: number }; geometry: Geom | null };
type Bbox = [number, number, number, number];

async function features(layer: number, offset: string): Promise<Feature[]> {
  const out: Feature[] = [];
  for (let at = 0; ; ) {
    const q = new URLSearchParams({ where: "1=1", outFields: "GEOID,NAME,AREALAND", orderByFields: "GEOID", outSR: "4326", f: "geojson",
      maxAllowableOffset: offset, geometryPrecision: "4", resultOffset: String(at), resultRecordCount: String(PAGE) });
    const res = await fetch(`${TIGER}/${layer}/query?${q}`);
    if (!res.ok) throw new Error(`TIGERweb layer ${layer} at ${at} → ${res.status}`);
    const page = await res.json() as { features?: Feature[]; error?: unknown };
    if (!page.features) throw new Error(`TIGERweb layer ${layer}: ${JSON.stringify(page.error ?? page)}`);
    out.push(...page.features);
    at += page.features.length;
    if (page.features.length < PAGE) break;
  }
  return out.filter((f) => f.geometry && f.properties.GEOID);
}

/** "Minneapolis-St. Paul-Bloomington, MN-WI Metro Area" → its search row ("…, MN-WI", "Metro area") (same leading shape as
 *  geo/search.json rows: [name, kind, code, lon, lat, sq mi], then states and bbox, as MPO rows). */
export function metroRow(name: string, cbsa: string, aland: number, b: Bbox): [string, string, string, number, number, number, string, Bbox] {
  const m = name.match(/^(.*), ([A-Z-]+) (Metro|Micro) Area$/);
  if (!m) throw new Error(`unexpected CBSA name "${name}"`);
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
  return [`${m[1]}, ${m[2]}`, `${m[3]} area`, `cbsa${cbsa}`, r4((b[0] + b[2]) / 2), r4((b[1] + b[3]) / 2), Math.max(1, Math.round(aland / 2589988)), m[2].split("-").join(", "), b];
}

// shortcut: one entry; ACS publishes Louisville's consolidated city (place 48000, FUNCSTAT N) only as the "(balance)" place 48006.
// Census's place list has no other C9 city with a C8 "(balance)" twin that matters (Nashville, Indianapolis, Augusta, Athens
// are already published as their balance place); check `missing` in the areas log after a new vintage.
const ACS_ID: Record<string, string> = { "2148000": "2148006" };
/** Places in states ACS has no data for (territories other than PR: 60, 66, 69, 78) are not cities here. */
export const inAcsStates = (placeGeoid: string) => placeGeoid.slice(0, 2) in STATES;
export const acsId = (placeGeoid: string) => ACS_ID[placeGeoid] ?? placeGeoid;

const round = (v: number | null, digits: number) => (v == null || !Number.isFinite(v) ? null : Number(v.toPrecision(digits)));

/** Each area's [value, moe] for every entry; areas the API has no row for get none. */
function valuesOf(entries: DatasetEntry[], table: Map<string, Row>, id: string): Record<string, [number | null, number | null]> {
  const row = table.get(id);
  if (!row) return {};
  return Object.fromEntries(entries.map((e) => {
    const v = derive(e, row);
    return [e.id, [round(v.value, 4), round(v.moe, 3)]];
  }));
}

export async function buildAreas() {
  const all = loadRegistry().filter((e) => e.areaLevels.length);
  if (!all.length) return log("areas", "no dataset has areaLevels");
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const write = (code: string, entries: DatasetEntry[], table: Map<string, Row>, f: Feature, id: string) => {
    const b = bboxOf(f.geometry!).map((v) => Math.round(v * 1e4) / 1e4) as Bbox;
    writeFileSync(join(OUT, `${code}.json`), JSON.stringify({ v: valuesOf(entries, table, id), g: f.geometry, b }));
    return b;
  };

  // Metro and micro areas: one API call per batch of variables, then the outlines.
  const metroEntries = all.filter((e) => e.areaLevels.includes("cbsa"));
  if (metroEntries.length) {
    const table = await fetchTable(varsOf(metroEntries), "for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:*");
    const rows = [];
    for (const kind of ["metro", "micro"] as const) {
      const fs = await features(LAYERS[kind], "0.002");
      for (const f of fs) {
        const b = write(`cbsa${f.properties.GEOID}`, metroEntries, table, f, f.properties.GEOID);
        rows.push(metroRow(f.properties.NAME, f.properties.GEOID, f.properties.AREALAND, b));
      }
      log("areas", `${fs.length} ${kind} areas`);
    }
    if (rows.length < 900) throw new Error(`areas: only ${rows.length} metro and micro areas`);
    const missing = rows.filter((r) => !table.has(r[2].slice(4))).length;
    if (missing > 20) throw new Error(`areas: ${missing} metro/micro areas have no ACS row (vintage mismatch?)`);
    writeFileSync(join(OUT, "index.json"), JSON.stringify(rows));
  }

  // Cities: incorporated places, one API call per state (as tracts).
  const placeEntries = all.filter((e) => e.areaLevels.includes("place"));
  if (placeEntries.length) {
    const vars = varsOf(placeEntries), table = new Map<string, Row>();
    for (const s of Object.keys(STATES)) for (const [k, v] of await fetchTable(vars, `for=place:*&in=state:${s}`)) table.set(k, v);
    const fs = (await features(LAYERS.place, "0.0005")).filter((f) => inAcsStates(f.properties.GEOID));
    for (const f of fs) write(`place${f.properties.GEOID}`, placeEntries, table, f, acsId(f.properties.GEOID));
    const missing = fs.filter((f) => !table.has(acsId(f.properties.GEOID))).length;
    log("areas", `${fs.length} incorporated places (${missing} with no ACS row)`);
    if (fs.length < 19000) throw new Error(`areas: only ${fs.length} incorporated places`);
    if (missing > 20) throw new Error(`areas: ${missing} incorporated places have no ACS row (vintage mismatch?)`);
  }
}
