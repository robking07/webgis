// CDC/NCHS VSRR provisional county drug overdose deaths, driven by registry entries with
// `measure.kind: overdose`. Pulls the 12-month-ending counts from data.cdc.gov (Socrata, no key)
// and divides by ACS population (population density × land area, as FARS does).
// CDC suppresses counts of 1–9: those counties have no `provisional_drug_overdose` value and get
// no value here either (never a zero). A reported 0 is a true zero.
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { timelineStops } from "@webgis/registry/timeline";
import { db, log } from "./util.ts";
import { registerDataset, writeStopValues, writeValues, type Value } from "./values.ts";

type Pool = Awaited<ReturnType<typeof db>>;
export interface OverdoseRow { fips?: string; provisional_drug_overdose?: string }

/** County deaths keyed by 5-digit FIPS. Suppressed (missing) counts are null; bad FIPS are skipped. */
export function parseOverdoseRows(rows: OverdoseRow[]): { deaths: Map<string, number | null>; suppressed: number; total: number } {
  const deaths = new Map<string, number | null>();
  let suppressed = 0, total = 0;
  for (const r of rows) {
    if (!r.fips || !/^\d{1,5}$/.test(r.fips)) continue; // CDC drops the leading zero: "1001"
    const g = r.fips.padStart(5, "0");
    const raw = r.provisional_drug_overdose;
    const n = raw == null || raw === "" ? NaN : Number(raw);
    if (Number.isFinite(n) && n >= 0) { deaths.set(g, n); total += n; } else { deaths.set(g, null); suppressed++; }
  }
  return { deaths, suppressed, total };
}

/** Deaths per `per` residents; suppressed or unpopulated counties get no value. Counties missing from
 *  `pop` (Connecticut's pre-2022 codes) can't be placed and are left out. */
export function overdoseRates(deaths: Map<string, number | null>, pop: Map<string, number>, per: number): Map<string, Value> {
  const out = new Map<string, Value>();
  for (const [g, p] of pop) {
    if (g.startsWith("72")) continue; // not in the CDC file
    const d = deaths.get(g);
    out.set(g, { value: d != null && p > 0 ? (d / p) * per : null, moe: null });
  }
  return out;
}

async function population(pool: Pool): Promise<Map<string, number>> {
  const { rows } = await pool.query<{ geoid: string; pop: number }>(
    `select v.geoid, v.value * g.aland_sqmi as pop from public.dataset_values v join public.geographies g using (geoid)
     where v.dataset_id = 'population_density' and v.level = 'county' and v.value is not null`);
  if (!rows.length) throw new Error("population_density must be loaded before overdose (it supplies the denominator)");
  return new Map(rows.map((r) => [r.geoid, r.pop]));
}

async function fetchPeriod(socrata: string, year: number, month: number) {
  const url = `https://data.cdc.gov/resource/${socrata}.json?$select=fips,provisional_drug_overdose,data_as_of`
    + `&year=${year}&month=${month}&$limit=5000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`overdose ${year}-${month} → ${res.status}`);
  const rows = (await res.json()) as Array<OverdoseRow & { data_as_of?: string }>;
  if (!rows.length) throw new Error(`overdose ${year}-${month}: no rows (period not published?)`);
  return { rows, asOf: rows[0].data_as_of?.slice(0, 10) ?? "unknown" };
}

async function one(e: DatasetEntry, pop: Map<string, number>, year: number) {
  if (e.measure.kind !== "overdose") throw new Error("not an overdose entry");
  const { socrata, endMonth, perPopulation } = e.measure;
  const { rows, asOf } = await fetchPeriod(socrata, year, endMonth);
  const { deaths, suppressed, total } = parseOverdoseRows(rows);
  const rates = overdoseRates(deaths, pop, perPopulation);
  const unmatched = [...deaths.keys()].filter((g) => !pop.has(g));
  log(e.id, `${year}-${endMonth}: ${rows.length} counties, ${suppressed} suppressed (1–9), ${total.toLocaleString()} deaths in unsuppressed counties, data as of ${asOf}; ${unmatched.length} not on current boundaries (Connecticut) dropped`);
  return rates;
}

export async function ingestOverdose(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "overdose" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "overdose") continue;
    await registerDataset(pool, e);
    await writeValues(pool, e.id, "county", await one(e, await population(pool), e.measure.endYear));
  }
  await pool.end();
}

/** Earlier 12-month periods (D-36), web export only. They use today's population, so older years
 *  are slightly off where counties have grown or shrunk. */
export async function ingestOverdoseTimeline(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "overdose" && e.timeline && (!only || only.includes(e.id)));
  const pool = db();
  const pop = entries.length ? await population(pool) : new Map<string, number>();
  for (const e of entries) {
    for (const s of timelineStops(e)) {
      if (s.isDefault) continue;
      writeStopValues(e.id, s.id, "county", await one(e, pop, +s.id));
    }
  }
  await pool.end();
}
