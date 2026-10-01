// Geography lookup table (no geometry): states, counties and tracts with names,
// land area and an internal point, from the 2024 Census Gazetteer files.
import { readFileSync } from "node:fs";
import unzipper from "unzipper";
import { cached, db, log, STATES, upsert } from "./util.ts";

const GAZ = "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer";

export async function readGazetteer(file: string): Promise<Record<string, string>[]> {
  const zip = await unzipper.Open.buffer(readFileSync(await cached(`${GAZ}/${file}.zip`)));
  const text = (await zip.files[0].buffer()).toString("utf8");
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const cols = head.split("\t").map((c) => c.trim());
  return lines.map((l) => Object.fromEntries(l.split("\t").map((v, i) => [cols[i], v.trim()])));
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
  for (const t of tracts) {
    const s = t.GEOID.slice(0, 2), cty = t.GEOID.slice(0, 5);
    if (!STATES[s]) continue;
    const num = (+t.GEOID.slice(5)) / 100;
    rows.push([t.GEOID, "tract", `Tract ${num}, ${countyName.get(cty) ?? cty}, ${STATES[s][1]}`, s, cty, +t.ALAND_SQMI, +t.INTPTLONG, +t.INTPTLAT]);
  }
  const pool = db();
  await upsert(pool, "public.geographies", ["geoid", "level", "name", "state_fips", "county_fips", "aland_sqmi", "lon", "lat"], ["geoid"], rows);
  await pool.end();
  log("geographies", `${st.size} states, ${counties.length} counties, ${tracts.length} tracts upserted`);
}
