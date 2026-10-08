// FEMA National Risk Index (registry `measure.kind: fema_nri`): state, county and tract values read
// from FEMA's public ArcGIS FeatureServer layers (no key; paged at 2,000 rows). One download per level
// covers every NRI entry: the attributes are cached in data/cache as JSON (no geometry; boundaries
// come from our own Census tiles, which use the same 2020 tracts and current Connecticut regions).
// Tract values go to static files, not the database (D-113), through writeValues.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { CACHE, db, log } from "./util.ts";
import { registerDataset, writeValues, type Value } from "./values.ts";

const SERVICES = "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services";
export const NRI_LAYERS = {
  // FEMA's state layer has expected annual loss only (no risk, vulnerability or resilience scores).
  state: { url: `${SERVICES}/National_Risk_Index_States_Expected_Annual_Loss/FeatureServer/0`, key: "STATEFIPS", geoidLength: 2 },
  county: { url: `${SERVICES}/National_Risk_Index_Counties/FeatureServer/0`, key: "STCOFIPS", geoidLength: 5 },
  tract: { url: `${SERVICES}/National_Risk_Index_Census_Tracts/FeatureServer/0`, key: "TRACTFIPS", geoidLength: 11 },
} as const;
type NriLevel = keyof typeof NRI_LAYERS;
type Row = Record<string, string | number | null>;
type NriMeasure = Extract<DatasetEntry["measure"], { kind: "fema_nri" }>;

/** The value one NRI row gives a dataset, or null for no data.
 *  - `perCapita`: divided by the NRI's own POPULATION (null when it's 0 or missing, or below
 *    `minPopulation`: a port or airport tract with 4 residents would show millions per person).
 *  - `ratingField`: when the value is blank and this rating says "Not Applicable" (FEMA doesn't
 *    consider the hazard possible there, e.g. coastal flooding far inland), the value is 0.
 *    Blanks rated "Insufficient Data" stay no data. */
export function nriValue(row: Row, m: Pick<NriMeasure, "field" | "perCapita" | "ratingField">, minPopulation = 1): number | null {
  if (m.perCapita && !(Number(row.POPULATION) >= Math.max(1, minPopulation))) return null;
  let v = row[m.field];
  if (v == null || v === "") {
    if (m.ratingField && row[m.ratingField] === "Not Applicable") v = 0;
    else return null;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return m.perCapita ? n / Number(row.POPULATION) : n;
}

/** Fields an entry reads from the NRI layer. */
export function nriFields(m: Pick<NriMeasure, "field" | "perCapita" | "ratingField">): string[] {
  return [m.field, ...(m.perCapita ? ["POPULATION"] : []), ...(m.ratingField ? [m.ratingField] : [])];
}

/** GET with retries for network and HTTP errors. An ArcGIS query error (bad field name…) comes
 *  back as 200 with an `error` body and isn't retried. */
async function getJson(url: string): Promise<{ features?: { attributes: Row }[]; count?: number; error?: unknown }> {
  for (let attempt = 0; ; attempt++) {
    let j;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
      j = await res.json();
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    if (j.error) throw new Error(`${url}: ${JSON.stringify(j.error)}`);
    return j;
  }
}

/** Every row of one NRI layer with the given fields, cached in data/cache. A cache that lacks a
 *  field (an entry was added since) is downloaded again. */
export async function nriRows(level: NriLevel, fields: string[], version: string): Promise<Row[]> {
  const layer = NRI_LAYERS[level];
  const want = [...new Set([layer.key, "NRI_VER", ...fields])].sort();
  const path = join(CACHE, `fema-nri-${level}.json`);
  if (existsSync(path)) {
    const c = JSON.parse(readFileSync(path, "utf8")) as { fields: string[]; rows: Row[] };
    if (want.every((f) => c.fields.includes(f))) return c.rows;
  }
  const where = "where=1%3D1";
  const { count } = await getJson(`${layer.url}/query?${where}&returnCountOnly=true&f=json`);
  const rows: Row[] = [];
  const page = 2000;
  for (let offset = 0; offset < (count ?? 0); offset += page) {
    const j = await getJson(`${layer.url}/query?${where}&outFields=${want.join(",")}&returnGeometry=false` +
      `&orderByFields=OBJECTID&resultOffset=${offset}&resultRecordCount=${page}&f=json`);
    for (const f of j.features ?? []) rows.push(f.attributes);
    if (level === "tract" && offset % 20000 === 0) log("nri", `tract: ${rows.length.toLocaleString()} of ${count!.toLocaleString()}`);
  }
  if (rows.length !== count) throw new Error(`NRI ${level}: got ${rows.length} rows, layer reports ${count}`);
  const versions = new Set(rows.map((r) => r.NRI_VER));
  if (versions.size !== 1 || !versions.has(version)) {
    throw new Error(`NRI ${level}: layer version ${[...versions].join(", ")}, registry expects "${version}". Re-check the entries before loading a new version.`);
  }
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, JSON.stringify({ fields: want, rows }));
  return rows;
}

export async function ingestNri(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "fema_nri" && (!only || only.includes(e.id)));
  if (!entries.length) return log("nri", "no fema_nri entries selected");
  const pool = db();
  for (const level of Object.keys(NRI_LAYERS) as NriLevel[]) {
    const mine = entries.filter((e) => e.geographyLevels.includes(level));
    if (!mine.length) continue;
    const measures = mine.map((e) => e.measure as NriMeasure);
    const versions = new Set(measures.map((m) => m.version));
    if (versions.size !== 1) throw new Error(`fema_nri entries disagree on version: ${[...versions].join(", ")}`);
    const rows = await nriRows(level, measures.flatMap(nriFields), [...versions][0]);
    const { key, geoidLength } = NRI_LAYERS[level];
    log("nri", `${level}: ${rows.length.toLocaleString()} rows`);
    for (const e of mine) {
      const m = e.measure as NriMeasure;
      const values = new Map<string, Value>();
      for (const r of rows) values.set(String(r[key]).padStart(geoidLength, "0"), { value: nriValue(r, m, level === "tract" ? m.minTractPopulation : 1), moe: null });
      await registerDataset(pool, e);
      await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
