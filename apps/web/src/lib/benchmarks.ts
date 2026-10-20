// The state and U.S. value beside a place's own (issue #288). State values come from the state's
// details file, U.S. values from values/<id>/us.json (D-257); a map with neither shows nothing.
import type { Unit } from "@webgis/design";
import { fetchDetail, fetchGeography, type Detail } from "./details";
import { usValue } from "./counts";
import type { Dataset } from "./registry";

/** Totals, categories and percentiles have no like-for-like state or U.S. figure. */
const NO_BENCHMARK = new Set<Unit>(["count", "agreements", "categories", "percentile"]);

/** The ingests that write a U.S. file (D-257; 287(g) is a total, above). Others would only 404. */
const US_KINDS = new Set(["acs5", "census2020", "lodes", "fars"]);

export type Benchmark = { label: string; value: number };

/** The benchmarks to show: the state (not for a state itself) and the U.S. (not for Puerto Rico,
 *  which the Census U.S. totals leave out), each only where a value exists. */
export function benchmarkRows(unit: Unit, geoid: string, state: { name: string; value: number | null } | null, us: number | null): Benchmark[] {
  if (NO_BENCHMARK.has(unit)) return [];
  const rows: Benchmark[] = [];
  if (geoid.length > 2 && state?.value != null) rows.push({ label: state.name, value: state.value });
  if (!geoid.startsWith("72") && us != null) rows.push({ label: "U.S.", value: us });
  return rows;
}

// shortcut: one small us.json fetch per map (cached), ~60 on a place page; bundle them into one file if that shows up as slow.
export async function loadBenchmarks(d: Dataset, geoid: string): Promise<Benchmark[]> {
  if (NO_BENCHMARK.has(d.unit)) return [];
  const st = geoid.slice(0, 2);
  // Benchmarks are an extra: a failed file shows nothing.
  const [geo, detail, us] = await Promise.all([
    fetchGeography(st).catch(() => null), fetchDetail(st).catch((): Detail => ({})), US_KINDS.has(d.measure.kind) ? usValue(d.id) : null]);
  return benchmarkRows(d.unit, geoid, geo && { name: geo.name, value: detail[d.id]?.value ?? null }, us);
}
