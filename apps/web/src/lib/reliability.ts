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

/** The details panel's plain-words note for a graded estimate; null when there's nothing to say. */
export function reliabilityNote(grade: Reliability | null): { title: string; body: string } | null {
  if (grade === "caution") return {
    title: "Use with caution",
    body: "The margin of error is fairly large compared with this estimate, so small differences from nearby areas may not be real.",
  };
  if (grade === "unreliable") return {
    title: "Unreliable estimate",
    body: "The margin of error is large compared with this estimate (about half of it or more), so the true value could be quite different.",
  };
  return null;
}
