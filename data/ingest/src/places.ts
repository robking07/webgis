// CDC PLACES ingest (county), driven by registry entries with `measure.kind: places`.
// Pulls each measure from the data.cdc.gov Socrata API. PLACES values are model-based
// small-area estimates (BRFSS + MRP); see each entry's `modelInputs`.
import { loadRegistry } from "@webgis/registry/load";
import { db, log } from "./util.ts";
import { registerDataset, writeValues, type Value } from "./values.ts";

export async function ingestPlaces(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "places" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "places") continue;
    const { socrata, measureId, valueType } = e.measure;
    await registerDataset(pool, e);
    const url = `https://data.cdc.gov/resource/${socrata}.json?$select=locationid,data_value,low_confidence_limit,high_confidence_limit`
      + `&measureid=${measureId}&datavaluetypeid=${valueType}&$limit=50000`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PLACES ${measureId} → ${res.status}`);
    const rows = (await res.json()) as Array<Record<string, string>>;
    const values = new Map<string, Value>();
    for (const r of rows) {
      const v = Number(r.data_value);
      if (!/^\d{5}$/.test(r.locationid) || !Number.isFinite(v)) continue;
      // Report half the 95% CI width in the MOE column (documented in data-sources.md).
      const lo = Number(r.low_confidence_limit), hi = Number(r.high_confidence_limit);
      values.set(r.locationid, { value: v, moe: Number.isFinite(lo) && Number.isFinite(hi) ? (hi - lo) / 2 : null });
    }
    log(e.id, `${rows.length} rows from ${socrata}`);
    await writeValues(pool, e.id, "county", values);
  }
  await pool.end();
}
