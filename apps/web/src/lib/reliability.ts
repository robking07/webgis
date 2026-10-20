// Which areas' estimates are unreliable (D-222), from files already published beside the tiles:
// tract values and margins in the per-county shards (values/tracts/<county>.json), block-group
// margins in values/<id>/block_group.moe.json. Grading itself lives in @webgis/design (reliability.ts).
import { gradeEstimate, type Reliability } from "@webgis/design";
import type { TractShard } from "./details";

/** Tract geoids in one county shard whose estimate for `datasetId` is unreliable. */
export function unreliableTracts(shard: TractShard | null, datasetId: string, county: string): string[] {
  const rows = shard?.[datasetId];
  if (!rows) return [];
  const out: string[] = [];
  for (const [tract, [value, moe]] of Object.entries(rows)) if (gradeEstimate(value, moe) === "unreliable") out.push(county + tract);
  return out;
}

/** Geoids whose value (from `values`) and margin (from `moes`) grade unreliable. */
export function unreliableIn(values: Record<string, number>, moes: Record<string, number>): string[] {
  const out: string[] = [];
  for (const [g, v] of Object.entries(values)) if (gradeEstimate(v, moes[g]) === "unreliable") out.push(g);
  return out;
}

/** The plain-words note for an estimate's grade; null when there's nothing to say. */
export function reliabilityNote(value: number | null | undefined, moe: number | null | undefined): { title: string; body: string } | null {
  const grade: Reliability | null = gradeEstimate(value, moe);
  if (grade === "caution") return {
    title: "Use with caution",
    body: "The margin of error is fairly large compared with this estimate, so small differences from nearby areas may not be real.",
  };
  if (grade === "unreliable") return {
    title: "Unreliable estimate",
    body: value === 0
      ? "The margin of error is large for an estimate of zero, so the true value could be well above zero."
      : "The margin of error is large compared with this estimate (about half of it or more), so the true value could be quite different.",
  };
  return null;
}

/** Why a place has no value (issue #193): from the registry's coverage note and the place's code
 *  where that's knowable, else a plain line. */
export function noDataReason(ds: { measure: { kind: string }; coverageNote?: string }, geoid: string): string {
  const census = ds.measure.kind === "acs5" || ds.measure.kind === "census2020";
  if (geoid.startsWith("72") && /Puerto Rico/.test(ds.coverageNote ?? "")) return "This source has no data for Puerto Rico.";
  // Connecticut's nine planning regions (091xx) replaced its counties in 2022; Census data uses them, older sources don't.
  if (/^091\d\d$/.test(geoid) && !census) return "This source still uses Connecticut's old counties (before 2022).";
  if (census) return "The Census Bureau doesn't publish this figure for this area.";
  return "The source has no value for this area.";
}
