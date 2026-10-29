// CDC PLACES ingest (county, and tract where the entry lists it), driven by registry entries with
// `measure.kind: places`. Pulls each measure from the data.cdc.gov Socrata API. PLACES values are
// model-based small-area estimates (BRFSS + MRP); see each entry's `modelInputs`.
import { loadRegistry } from "@webgis/registry/load";
import { db, log } from "./util.ts";
import { registerDataset, writeValues, type Value } from "./values.ts";

const LIMIT = 200000; // one page; a tract measure is ~79k rows

/** One measure from one PLACES release, keyed by FIPS code of the given length (5 county, 11 tract). */
async function fetchPlaces(socrata: string, measureId: string, valueType: string, digits: number): Promise<Map<string, Value>> {
  const url = `https://data.cdc.gov/resource/${socrata}.json?$select=locationid,data_value,low_confidence_limit,high_confidence_limit`
    + `&measureid=${measureId}&datavaluetypeid=${valueType}&$limit=${LIMIT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PLACES ${socrata} ${measureId} → ${res.status}`);
  const rows = (await res.json()) as Array<Record<string, string>>;
  if (rows.length >= LIMIT) throw new Error(`PLACES ${socrata} ${measureId}: ${rows.length} rows hit the page limit`);
  const values = new Map<string, Value>();
  const geoid = new RegExp(`^\\d{${digits}}$`);
  for (const r of rows) {
    const v = Number(r.data_value);
    if (!geoid.test(r.locationid) || !Number.isFinite(v)) continue;
    // Report half the 95% CI width in the MOE column (documented in data-sources.md).
    const lo = Number(r.low_confidence_limit), hi = Number(r.high_confidence_limit);
    values.set(r.locationid, { value: v, moe: Number.isFinite(lo) && Number.isFinite(hi) ? (hi - lo) / 2 : null });
  }
  log(measureId, `${rows.length} rows from ${socrata}`);
  return values;
}

export async function ingestPlaces(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "places" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "places") continue;
    const { socrata, measureId, valueType, tractSocrata } = e.measure;
    await registerDataset(pool, e);
    await writeValues(pool, e.id, "county", await fetchPlaces(socrata, measureId, valueType, 5));
    if (!e.geographyLevels.includes("tract")) continue;
    if (!tractSocrata) throw new Error(`${e.id}: geographyLevels has tract but measure.tractSocrata is missing`);
    // CDC publishes tracts as crude prevalence only.
    await writeValues(pool, e.id, "tract", await fetchPlaces(tractSocrata, measureId, "CrdPrv", 11));
  }
  await pool.end();
}
