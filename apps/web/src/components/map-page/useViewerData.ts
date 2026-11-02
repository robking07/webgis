import { useMemo, useSyncExternalStore } from "react";
import { bandShift, childLevel, focusBands, GEO_LEVELS, type Unit, LAZY_LEVELS, levelAtZoom, levelBands, pinnedBands, TILE_VALUE_LEVELS, type GeoLevel } from "@webgis/design";
import type { Focus, LevelPaint } from "../map/MapView";
import { levelOfGeoid } from "@/lib/place";
import { DATASET_BY_ID } from "@/lib/registry";
import { featureLayerSpec, isFeatureDataset, pairReason } from "@/lib/layers";
import type { UrlState } from "@/lib/url-state";
import { blockPaintFrom, classifyBivariateCached, classifyFittedCached, classifyUnivariateCached, useDatasetValues, viewBreaks, type Classed } from "@/lib/values";
import { changeEnds, stopsFor } from "@/lib/periods";
import { classifyChangeCached, type ChangeMeasure } from "@/lib/change";
import type { Values } from "@/lib/values";
import { useChangeMoes } from "./useChangeMoes";

export const LEVELS = Object.keys(GEO_LEVELS) as GeoLevel[];
/** Levels with published margin files at every ACS stop (D-257). */
const MOE_LEVELS = new Set<GeoLevel>(["state", "county", "tract"]);

export type ClassedLevel = LevelPaint & {
  breaks?: number[]; xBreaks?: number[]; yBreaks?: number[]; minClass?: number;
  /** The breaks fit the counties in view, not the U.S. (issue #439). */
  fitted?: boolean;
  /** Change maps (issue #127): class labels, strip ends, geoid → change, how it's measured, and
   *  whether margins of error were tested. */
  labels?: string[]; ends?: [string, string]; change?: Values; measure?: ChangeMeasure; tested?: boolean;
};

/** What the map shows for the URL state: the datasets, the year stop, the geography levels and
 *  zoom bands, the loaded values, and their classification (one paint per level).
 *  `tractCounties`: counties whose tracts are on screen (fitted breaks follow them, issue #439). */
export function useViewerData(state: UrlState, tractCounties: readonly string[] = []) {
  const primary = state.d ? DATASET_BY_ID.get(state.d)! : null;
  // Feature layers (roads, transit…) draw their own geometry: no choropleth, no comparison.
  const isFeature = isFeatureDataset(primary);
  const featureSpec = useMemo(() => (primary && isFeature ? featureLayerSpec(primary) : null), [primary, isFeature]);
  const b = state.b ? DATASET_BY_ID.get(state.b) : undefined;
  const secondary = primary && b && !pairReason(primary, b) ? b : null;
  // Year control (D-36): single-dataset maps only; comparisons use the default period.
  const stops = useMemo(() => (secondary || isFeature ? [] : stopsFor(primary)), [primary, secondary, isFeature]);
  // Change map (issue #127): from `since` to the year `t`, or to the latest period (issue #168).
  const ends = useMemo(() => changeEnds(stops, state.t, state.since), [stops, state.t, state.since]);
  const since = ends?.from ?? null;
  const stop = ends ? ends.to : stops.find((s) => s.id === state.t) ?? stops.find((s) => s.isDefault) ?? null;
  /** The shown stop when it isn't the default; null = the default period. */
  const stopId = stop && !stop.isDefault ? stop.id : null;
  // Levels both datasets have (and the shown stop has). Blocks (values in the tiles) can't be
  // compared: no bivariate join.
  const valueLevels = useMemo(() => isFeature ? [] : LEVELS.filter((l) => (!primary || primary.geographyLevels.includes(l)) && (!secondary || (secondary.geographyLevels.includes(l) && !TILE_VALUE_LEVELS.has(l))) && (!stopId || stop!.levels.includes(l))), [primary, secondary, isFeature, stopId, stop]);
  // A change needs values at both stops; blocks have no earlier values. `valueLevels` stay
  // pickable in change mode: picking one without change shows its values (issue #249).
  const availableLevels = useMemo(() => valueLevels.filter((l) => !since || (since.levels.includes(l) && !TILE_VALUE_LEVELS.has(l))), [valueLevels, since]);
  // Switch with zoom is the default for every dataset (Robbie, 2026-10-02; replaces D-35's
  // "finest level at every zoom"). lv=<level> pins one; lv=auto is the old spelling of the default.
  // A pinned block group or block never draws at national or multi-state zoom (pinFloor).
  const pinnedLevel = state.lv && state.lv !== "auto" && availableLevels.includes(state.lv) ? state.lv : null;
  // Drill-down (issue #203): `in=<geoid>` focuses a place with a finer level inside it; its bands
  // override switch-with-zoom and a pinned level (Robbie, 2026-10-14).
  const focusLevel = state.in ? levelOfGeoid(state.in) : null;
  const focusChild = focusLevel && availableLevels.includes(focusLevel) ? childLevel(availableLevels, focusLevel) : null;
  const focus = useMemo<Focus | null>(() => (focusChild ? { level: focusLevel!, geoid: state.in!, child: focusChild } : null), [focusLevel, focusChild, state.in]);
  const shift = useBandShift();
  const bands = useMemo(() => (focus ? focusBands(focus.level, focus.child, shift) : pinnedLevel ? pinnedBands(availableLevels, pinnedLevel, shift) : levelBands(availableLevels, shift)), [focus, availableLevels, pinnedLevel, shift]);
  // Start loading tract / block-group values a little before they appear. Blocks are colored
  // with the block-group classes, so block groups load when blocks are near too.
  const nearBlocks = !!bands.block && state.at.zoom >= bands.block.minzoom - 1;
  const nearBg = !!bands.block_group && state.at.zoom >= bands.block_group.minzoom - 1;
  // Block groups are colored with the tract breaks (issue #325), so tracts load whenever they do.
  const want = LEVELS.filter((l) => LAZY_LEVELS.has(l) && ((!!bands[l] && state.at.zoom >= bands[l]!.minzoom - 1) || (l === "block_group" && nearBlocks) || (l === "tract" && (nearBg || nearBlocks))));
  // Blocks carry their values as a tile property (2020 Census only; D-124).
  const blockField = primary?.measure.kind === "census2020" ? primary.measure.value : null;
  const x = useDatasetValues(primary, want, stopId, stop?.levels);
  const y = useDatasetValues(secondary, want);
  // A non-default stop is colored with the default view's breaks, so stepping shows change.
  const xBase = useDatasetValues(stopId && !since ? primary : null, want);
  const xFrom = useDatasetValues(since ? primary : null, want, since && !since.isDefault ? since.id : null, since?.levels);
  const level = levelAtZoom(bands, state.at.zoom) ?? availableLevels[0] ?? "county";
  // ACS change maps test each change against both stops' published margins (state, county, tract;
  // D-257, D-557); tract margins load only once tracts are wanted.
  const moeLevels = availableLevels.filter((l) => MOE_LEVELS.has(l) && (!LAZY_LEVELS.has(l) || want.includes(l)));
  const moes = useChangeMoes(since && primary?.measure.kind === "acs5" ? primary.id : null, since && !since.isDefault ? since.id : null, stopId, moeLevels);

  // Issue #439: zoomed in to neighbourhoods on a one-dataset map at its default period, tracts and
  // block groups take breaks fitted to every place in the counties on screen. Change maps, compare
  // and other years keep the U.S. breaks (moving colors there would hide the change).
  // shortcut: the re-class runs on the main thread over every tract and block group (~0.1–0.5 s on a slow phone
  // per county change); move it into the values worker if pans feel sticky.
  const fit = !!primary && !isFeature && !since && !secondary && !stopId && (LAZY_LEVELS.has(level) || TILE_VALUE_LEVELS.has(level));
  const fitBase = fit ? ((stop?.levels ?? primary!.geographyLevels).includes("tract") ? x.values.tract : x.values.block_group) : undefined;
  const countyKey = tractCounties.join(",");
  const fitted = useMemo(() => (fitBase && countyKey ? viewBreaks(primary!, fitBase, countyKey.split(",")) : null), [primary, fitBase, countyKey]);

  // Cached classification keeps its identity, so the map only repaints when the data changes (D-114).
  const classed = useMemo(() => {
    const out: Partial<Record<GeoLevel, ClassedLevel>> = {};
    if (!primary) return out;
    // Tracts and block groups are both neighbourhood scale: block groups take the tract breaks (issue #325).
    // shortcut: if the tract file fails to load, block groups stay uncolored; fall back to their own breaks if that is ever seen.
    const tractBreaks = (stopId ? primary.geographyLevels : stop?.levels ?? primary.geographyLevels).includes("tract");
    for (const l of LEVELS) {
      const xv = x.values[l];
      if (!xv) continue;
      if (since) {
        const fv = xFrom.values[l];
        if (fv) out[l] = classifyChangeCached(fv, xv, primary.unit as Unit, moes[l]);
      } else if (secondary) {
        const yv = y.values[l];
        if (yv) out[l] = classifyBivariateCached(xv, yv);
      } else {
        const base = (stopId ? xBase.values : x.values)[l === "block_group" && tractBreaks ? "tract" : l];
        if (base) out[l] = fitted && LAZY_LEVELS.has(l) ? classifyFittedCached(primary, xv, fitted) : classifyUnivariateCached(primary, xv, base === xv ? undefined : base);
      }
    }
    const bg = out.block_group;
    if (blockField && !secondary && bg?.breaks) out.block = blockPaintFrom(bg as Classed, blockField);
    return out;
  }, [primary, secondary, x.values, y.values, stopId, stop, xBase.values, blockField, since, xFrom.values, moes, fitted]);

  // `fit`: the map reports the counties in view (MapView's watchCounties) so the breaks can follow them.
  return { primary, secondary, isFeature, featureSpec, stops, stop, stopId, since, xBase, xFrom, fit, valueLevels, availableLevels, pinnedLevel, focus, bands, x, y, level, classed, blockField };
}

const onResize = (cb: () => void) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); };
/** Zoom-band offset for this screen (the map is full-bleed), in quarter zooms. */
function useBandShift(): number {
  return useSyncExternalStore(onResize, () => bandShift(window.innerWidth, window.innerHeight), () => 0);
}
