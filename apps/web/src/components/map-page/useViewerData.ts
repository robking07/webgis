import { useMemo } from "react";
import { GEO_LEVELS, levelAtZoom, levelBands, type GeoLevel } from "@webgis/design";
import type { LevelPaint } from "../map/MapView";
import { DATASET_BY_ID } from "@/lib/registry";
import { featureLayerSpec, isFeatureDataset } from "@/lib/layers";
import type { UrlState } from "@/lib/url-state";
import { classifyBivariateCached, classifyUnivariateCached, useDatasetValues } from "@/lib/values";
import { stopsFor } from "@/lib/periods";

export const LEVELS = Object.keys(GEO_LEVELS) as GeoLevel[];

export type ClassedLevel = LevelPaint & { breaks?: number[]; xBreaks?: number[]; yBreaks?: number[]; minClass?: number };

/** What the map shows for the URL state: the datasets, the year stop, the geography levels and
 *  zoom bands, the loaded values, and their classification (one paint per level). */
export function useViewerData(state: UrlState) {
  const primary = state.d ? DATASET_BY_ID.get(state.d)! : null;
  // Feature layers (roads, transit…) draw their own geometry: no choropleth, no comparison.
  const isFeature = isFeatureDataset(primary);
  const featureSpec = useMemo(() => (primary && isFeature ? featureLayerSpec(primary) : null), [primary, isFeature]);
  const secondary = state.b && !isFeature && !isFeatureDataset(DATASET_BY_ID.get(state.b)) ? DATASET_BY_ID.get(state.b)! : null;
  // Year control (D-36): single-dataset maps only; comparisons use the default period.
  const stops = useMemo(() => (secondary || isFeature ? [] : stopsFor(primary)), [primary, secondary, isFeature]);
  const stop = stops.find((s) => s.id === state.t) ?? stops.find((s) => s.isDefault) ?? null;
  /** The shown stop when it isn't the default; null = the default period. */
  const stopId = stop && !stop.isDefault ? stop.id : null;
  // Levels both datasets have (and the shown stop has).
  const availableLevels = useMemo(() => isFeature ? [] : LEVELS.filter((l) => (!primary || primary.geographyLevels.includes(l)) && (!secondary || secondary.geographyLevels.includes(l)) && (!stopId || stop!.levels.includes(l))), [primary, secondary, isFeature, stopId, stop]);
  // Default level: how the source publishes the data, i.e. its finest level (ACS → tracts),
  // drawn at every zoom (D-35). "Switch with zoom" (lv=auto) restores the old zoom bands.
  const defaultLevel = primary?.defaultLevel && availableLevels.includes(primary.defaultLevel) ? primary.defaultLevel : availableLevels[availableLevels.length - 1] ?? null;
  const pinnedLevel = state.lv === "auto" ? null : state.lv && availableLevels.includes(state.lv) ? state.lv : defaultLevel;
  const bands = useMemo(() => (pinnedLevel ? { [pinnedLevel]: { minzoom: 0, maxzoom: 24 } } : levelBands(availableLevels)), [availableLevels, pinnedLevel]);
  // Start loading tract values a little before tracts appear.
  const wantTract = !!bands.tract && state.at.zoom >= bands.tract.minzoom - 1;
  const x = useDatasetValues(primary, wantTract, stopId, stop?.levels);
  const y = useDatasetValues(secondary, wantTract);
  // A non-default stop is colored with the default view's breaks, so stepping shows change.
  const xBase = useDatasetValues(stopId ? primary : null, wantTract);
  const level = levelAtZoom(bands, state.at.zoom) ?? availableLevels[0] ?? "county";

  // Cached classification keeps its identity, so the map only repaints when the data changes (D-114).
  const classed = useMemo(() => {
    const out: Partial<Record<GeoLevel, ClassedLevel>> = {};
    if (!primary) return out;
    for (const l of LEVELS) {
      const xv = x.values[l];
      if (!xv) continue;
      if (secondary) {
        const yv = y.values[l];
        if (yv) out[l] = classifyBivariateCached(xv, yv);
      } else if (stopId) {
        if (xBase.values[l]) out[l] = classifyUnivariateCached(primary, xv, xBase.values[l]);
      } else {
        out[l] = classifyUnivariateCached(primary, xv);
      }
    }
    return out;
  }, [primary, secondary, x.values, y.values, stopId, xBase.values]);

  return { primary, secondary, isFeature, featureSpec, stops, stop, stopId, availableLevels, defaultLevel, pinnedLevel, bands, x, y, level, classed };
}
