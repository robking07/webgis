// Geography lookup table (no geometry): states, counties and tracts with names,
// land area and an internal point, from the 2024 Census Gazetteer files.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as shapefile from "shapefile";
import unzipper from "unzipper";
import { cached, db, log, STATES, TILES, upsert } from "./util.ts";

const GAZ = (year: number) => `https://www2.census.gov/geo/docs/maps-data/data/gazetteer/${year}_Gazetteer`;

/** A national Gazetteer file, e.g. "2024_Gaz_counties_national" (the year comes from the name). */
export async function readGazetteer(file: string): Promise<Record<string, string>[]> {
  const zip = await unzipper.Open.buffer(readFileSync(await cached(`${GAZ(+file.slice(0, 4))}/${file}.zip`)));
  const text = (await zip.files[0].buffer()).toString("utf8");
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const cols = head.split("\t").map((c) => c.trim());
  return lines.map((l) => Object.fromEntries(l.split("\t").map((v, i) => [cols[i], v.trim()])));
}

/** Block-group land area (sq mi) from the cartographic boundary file; the Gazetteer has no
 *  block groups and block groups aren't in the database (D-124). */
export async function blockGroupLandArea(): Promise<Map<string, number>> {
  const zip = await unzipper.Open.buffer(readFileSync(await cached("https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_bg_500k.zip")));
  const dbf = zip.files.find((f) => f.path.endsWith(".dbf"))!;
  const src = await shapefile.openDbf(await dbf.buffer());
  const out = new Map<string, number>();
  for (let r = await src.read(); !r.done; r = await src.read()) {
    const p = r.value as Record<string, string | number>;
    out.set(String(p.GEOID), Number(p.ALAND) / 2_589_988.11);
  }
  return out;
}

export async function ingestGeographies() {
  const counties = await readGazetteer("2024_Gaz_counties_national");
  const tracts = await readGazetteer("2024_Gaz_tracts_national");
  const countyName = new Map(counties.map((c) => [c.GEOID, c.NAME]));
  const rows: unknown[][] = [];

  // States: land area summed from counties, point = land-area-weighted mean of county points.
  const st = new Map<string, { a: number; x: number; y: number }>();
  for (const c of counties) {
    const s = c.GEOID.slice(0, 2), a = +c.ALAND_SQMI;
    const acc = st.get(s) ?? { a: 0, x: 0, y: 0 };
    acc.a += a; acc.x += a * +c.INTPTLONG; acc.y += a * +c.INTPTLAT;
    st.set(s, acc);
  }
  for (const [fips, acc] of st) {
    if (!STATES[fips]) continue;
    rows.push([fips, "state", STATES[fips][0], fips, null, acc.a, acc.x / acc.a, acc.y / acc.a]);
  }
  for (const c of counties) {
    const s = c.GEOID.slice(0, 2);
    if (!STATES[s]) continue;
    rows.push([c.GEOID, "county", `${c.NAME}, ${STATES[s][1]}`, s, c.GEOID, +c.ALAND_SQMI, +c.INTPTLONG, +c.INTPTLAT]);
  }
  const tractList = tractRows(tracts, countyName);
  for (const t of tractList) rows.push([t.geoid, "tract", t.name, t.geoid.slice(0, 2), t.geoid.slice(0, 5), t.aland_sqmi, t.lon, t.lat]);
  writeTractGeography(tractList);
  const pool = db();
  await upsert(pool, "public.geographies", ["geoid", "level", "name", "state_fips", "county_fips", "aland_sqmi", "lon", "lat"], ["geoid"], rows);
  await pool.end();
  log("geographies", `${st.size} states, ${counties.length} counties, ${tracts.length} tracts upserted`);
}

type TractRow = { geoid: string; name: string; lon: number; lat: number; aland_sqmi: number };

/** Tracts as the database's `geographies` holds them (same name, point and land area). */
function tractRows(tracts: Record<string, string>[], countyName: Map<string, string>): TractRow[] {
  const out: TractRow[] = [];
  for (const t of tracts) {
    const s = t.GEOID.slice(0, 2), cty = t.GEOID.slice(0, 5);
    if (!STATES[s]) continue;
    const num = (+t.GEOID.slice(5)) / 100;
    out.push({ geoid: t.GEOID, name: `Tract ${num}, ${countyName.get(cty) ?? cty}, ${STATES[s][1]}`, lon: +t.INTPTLONG, lat: +t.INTPTLAT, aland_sqmi: +t.ALAND_SQMI });
  }
  return out;
}

export const TRACT_GEO_DIR = join(TILES, "geo", "tracts");

/** Tract place pages read a tract's name, point and land area from a per-county file on R2
 *  (S2, issue #106), not the database: geo/tracts/<county fips>.json =
 *  { "<6-digit tract code>": [name, lon, lat, land sq mi] }. */
function writeTractGeography(rows: TractRow[]) {
  const byCounty = new Map<string, Record<string, [string, number, number, number]>>();
  for (const r of rows) {
    const c = r.geoid.slice(0, 5);
    (byCounty.get(c) ?? byCounty.set(c, {}).get(c)!)[r.geoid.slice(5)] = [r.name, r.lon, r.lat, r.aland_sqmi];
  }
  rmSync(TRACT_GEO_DIR, { recursive: true, force: true });
  mkdirSync(TRACT_GEO_DIR, { recursive: true });
  for (const [c, tracts] of byCounty) writeFileSync(join(TRACT_GEO_DIR, `${c}.json`), JSON.stringify(tracts));
  log("geographies", `geo/tracts: ${rows.length} tracts in ${byCounty.size} county files`);
}

/** `ingest tract-geo`: the tract geography files alone, from the Gazetteer (no database). */
export async function tractGeography() {
  const counties = await readGazetteer("2024_Gaz_counties_national");
  const tracts = await readGazetteer("2024_Gaz_tracts_national");
  writeTractGeography(tractRows(tracts, new Map(counties.map((c) => [c.GEOID, c.NAME]))));
}

/** Land area (sq mi) by geoid on 2019 boundaries (2010 tracts, pre-2022 Connecticut counties),
 *  for timeline periods keyed to them (D-36). They aren't in the database: only the default
 *  period is (free-tier budget). */
export async function areas2019(level: "county" | "tract"): Promise<Map<string, number>> {
  const rows = await readGazetteer(level === "county" ? "2019_Gaz_counties_national" : "2019_Gaz_tracts_national");
  return new Map(rows.map((r) => [r.GEOID, +r.ALAND_SQMI]));
}
