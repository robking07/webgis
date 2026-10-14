// Feature layers (roads, transit, points): what the map needs to draw each one, written by
// the `features` ingest step to src/generated/layers.json.
import manifest from "@/generated/layers.json";
import { rampColors, TILE_VALUE_LEVELS, type RampId } from "@webgis/design";
import type { Dataset } from "./registry";

/** A popup field: label and unit, plus optional explainers (D-35). */
export interface FeatureField {
  label: string;
  unit?: string;
  explainer?: string;
  url?: string;
  /** Comma-separated list fields: each item's explainer and link. */
  items?: Record<string, { description: string; url?: string }>;
}

export interface FeatureLayerInfo {
  tiles: string;
  sourceLayer: string;
  geometry: "line" | "point" | "polygon";
  valueField: string;
  fields: Record<string, FeatureField | string>;
  rankField: string | null;
  featureCount: number;
}
const LAYERS = manifest as unknown as Record<string, FeatureLayerInfo>;

export const isFeatureDataset = (d: Dataset | null | undefined) => d?.measure.kind === "features";

/** Why two datasets can't be compared on one two-variable map, or null when they can (issue #198).
 *  The viewer and the dataset picker share it, so a pair the picker offers always draws. They need
 *  area values (not roads or sites) at a geography level in common; blocks carry their values in the
 *  tiles, so they have no two-variable join. */
export function pairReason(a: Dataset, b: Dataset): string | null {
  if (a.id === b.id) return "Already in this comparison";
  if (isFeatureDataset(a) || isFeatureDataset(b)) return "Roads and sites can't be compared";
  const shared = a.geographyLevels.some((l) => !TILE_VALUE_LEVELS.has(l) && b.geographyLevels.includes(l));
  return shared ? null : "Not mapped for the same kinds of area";
}

export interface FeatureLayerSpec extends FeatureLayerInfo {
  id: string;
  breaks: number[];
  colors: string[];
}

export function featureLayerSpec(d: Dataset): FeatureLayerSpec | null {
  const info = LAYERS[d.id];
  if (!info || !d.symbology.breaks) return null;
  return { id: d.id, ...info, breaks: d.symbology.breaks, colors: rampColors(d.symbology.ramp as RampId, d.symbology.breaks.length + 1) };
}

/** FHWA functional classification codes. */
export const F_SYSTEM: Record<number, string> = {
  1: "Interstate", 2: "Freeway / expressway", 3: "Principal arterial", 4: "Minor arterial",
  5: "Major collector", 6: "Minor collector", 7: "Local",
};
