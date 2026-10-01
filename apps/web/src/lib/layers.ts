// Feature layers (roads, transit, points): what the map needs to draw each one, written by
// the `features` ingest step to src/generated/layers.json.
import manifest from "@/generated/layers.json";
import { rampColors, type RampId } from "@webgis/design";
import type { Dataset } from "./registry";

export interface FeatureLayerInfo {
  tiles: string;
  sourceLayer: string;
  geometry: "line" | "point";
  valueField: string;
  fields: Record<string, string>;
  rankField: string | null;
  featureCount: number;
}
const LAYERS = manifest as unknown as Record<string, FeatureLayerInfo>;

export const isFeatureDataset = (d: Dataset | null | undefined) => d?.measure.kind === "features";

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
