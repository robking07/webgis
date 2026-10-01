// Map styles built only from tokens: the basemap (OpenMapTiles schema, served by
// OpenFreeMap) and the layer stack for a thematic dataset. Data values are joined on
// the client through feature state: each feature gets `c` = its class index, so the
// same tiles serve every dataset and adding one needs no re-tiling.
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import { THEMES, type ThemeName } from "./themes.ts";
import { LABEL, RANK_WIDTH, SIZE, zoomInterp, GEO_LEVELS, type GeoLevel } from "./sizing.ts";

export const BASEMAP = {
  tilejson: "https://tiles.openfreemap.org/planet",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  attribution:
    '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
};

/** The U.S. "focus land" fill (from the state boundary tiles) goes directly below this layer. */
export const FOCUS_LAND_BEFORE_ID = "park";

/** Thematic layers are inserted directly below this basemap layer: the reference overlays
 *  (rivers, interstates) and the labels stay on top of the data. */
export const DATA_BEFORE_ID = "overlay-river-casing";

export function basemapStyle(themeName: ThemeName): StyleSpecification {
  const m = THEMES[themeName].map;
  const halo = { "text-halo-color": m.labelHalo, "text-halo-width": LABEL.haloWidth };
  const layers: LayerSpecification[] = [
    { id: "background", type: "background", paint: { "background-color": m.background } },
    {
      id: "park", type: "fill", source: "omt", "source-layer": "park",
      paint: { "fill-color": m.park },
    },
    {
      id: "water", type: "fill", source: "omt", "source-layer": "water",
      paint: { "fill-color": m.water },
    },
    // Shoreline: gives oceans, the Great Lakes and big rivers a crisp edge at every zoom.
    {
      id: "coastline", type: "line", source: "omt", "source-layer": "water",
      filter: ["!=", ["get", "brunnel"], "tunnel"],
      paint: { "line-color": m.coastline, "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.6, 6, 1, 12, 1.4] as never, "line-opacity": 0.9 },
    },
    {
      id: "waterway", type: "line", source: "omt", "source-layer": "waterway", minzoom: 8,
      paint: { "line-color": m.waterLine, "line-width": zoomInterp(SIZE.line) as never },
    },
    {
      id: "road-minor", type: "line", source: "omt", "source-layer": "transportation", minzoom: 11,
      filter: ["in", ["get", "class"], ["literal", ["minor", "tertiary", "secondary"]]],
      paint: { "line-color": m.road, "line-width": zoomInterp(SIZE.line) as never },
    },
    {
      id: "road-major", type: "line", source: "omt", "source-layer": "transportation", minzoom: 5,
      filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]],
      paint: { "line-color": m.roadMajor, "line-width": zoomInterp(SIZE.lineMajor) as never },
    },
    // State lines and the national border: under thematic fills' labels, above land.
    {
      id: "boundary-state", type: "line", source: "omt", "source-layer": "boundary", minzoom: 2,
      filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]],
      paint: { "line-color": m.stateLine, "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 8, 1.2] as never, "line-dasharray": [3, 2] },
    },
    {
      id: "boundary-country-halo", type: "line", source: "omt", "source-layer": "boundary",
      filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
      paint: { "line-color": m.countryHalo, "line-width": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 8, 5] as never, "line-opacity": 0.55 },
    },
    {
      id: "boundary-country", type: "line", source: "omt", "source-layer": "boundary",
      filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
      paint: { "line-color": m.countryLine, "line-width": ["interpolate", ["linear"], ["zoom"], 2, 1, 8, 2] as never },
    },
    // Reference overlays: above thematic data (cased so they read over any fill), below labels.
    {
      id: "overlay-river-casing", type: "line", source: "omt", "source-layer": "waterway", minzoom: 3,
      filter: ["all", ["==", ["get", "class"], "river"], ["!=", ["get", "intermittent"], 1], ["!=", ["get", "brunnel"], "tunnel"]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": m.riverCasing, "line-opacity": 0.7, "line-width": zoomInterp(SIZE.riverCasing) as never },
    },
    {
      id: "overlay-river", type: "line", source: "omt", "source-layer": "waterway", minzoom: 3,
      filter: ["all", ["==", ["get", "class"], "river"], ["!=", ["get", "intermittent"], 1], ["!=", ["get", "brunnel"], "tunnel"]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": m.river, "line-width": zoomInterp(SIZE.river) as never },
    },
    {
      id: "overlay-interstate-casing", type: "line", source: "omt", "source-layer": "transportation", minzoom: 4,
      filter: ["all", ["==", ["get", "class"], "motorway"], ["!=", ["get", "ramp"], 1]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": m.interstateCasing, "line-opacity": 0.85, "line-width": zoomInterp(SIZE.interstateCasing) as never },
    },
    {
      id: "overlay-interstate", type: "line", source: "omt", "source-layer": "transportation", minzoom: 4,
      filter: ["all", ["==", ["get", "class"], "motorway"], ["!=", ["get", "ramp"], 1]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": m.interstate, "line-width": zoomInterp(SIZE.interstate) as never },
    },
    // Labels: everything from here up sits above thematic data.
    {
      id: "label-water", type: "symbol", source: "omt", "source-layer": "water_name",
      layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": ["Noto Sans Italic"], "text-size": 12 },
      paint: { "text-color": m.labelMuted, ...halo },
    },
    {
      id: "label-place", type: "symbol", source: "omt", "source-layer": "place", minzoom: 4,
      filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": LABEL.font as unknown as string[],
        "text-size": zoomInterp(LABEL.sizes.city) as never,
        "symbol-sort-key": ["get", "rank"],
      },
      paint: { "text-color": m.label, ...halo },
    },
    {
      id: "label-interstate", type: "symbol", source: "omt", "source-layer": "transportation_name", minzoom: 6,
      filter: ["all", ["==", ["get", "network"], "us-interstate"], ["has", "ref"]],
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": LABEL.symbolSpacing,
        "text-field": ["concat", "I-", ["get", "ref"]],
        "text-font": LABEL.fontBold as unknown as string[],
        "text-size": 10,
        "text-rotation-alignment": "viewport",
      },
      paint: { "text-color": m.shieldText, "text-halo-color": m.interstate, "text-halo-width": 3 },
    },
    {
      id: "label-state", type: "symbol", source: "omt", "source-layer": "place", minzoom: 3, maxzoom: 7,
      filter: ["==", ["get", "class"], "state"],
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": LABEL.fontBold as unknown as string[],
        "text-size": zoomInterp(LABEL.sizes.state) as never,
        "text-transform": "uppercase",
        "text-letter-spacing": 0.08,
      },
      paint: { "text-color": m.labelMuted, ...halo },
    },
  ];
  return {
    version: 8,
    glyphs: BASEMAP.glyphs,
    sources: { omt: { type: "vector", url: BASEMAP.tilejson, attribution: BASEMAP.attribution } },
    layers,
  };
}

export interface ThematicLayerOptions {
  /** Source id that carries this level's boundary tiles. */
  source: string;
  sourceLayer: string;
  level: GeoLevel;
  colors: string[];
  theme: ThemeName;
  /** Override GEO_LEVELS' zoom band for this level. */
  zooms?: { minzoom: number; maxzoom: number };
}

/** Fill-color expression: class index in feature state `c` → ramp color; missing → no-data. */
export function choroplethFill(colors: string[], theme: ThemeName): unknown {
  const noData = THEMES[theme].map.noData;
  if (colors.length === 0) return noData;
  return [
    "case",
    ["==", ["feature-state", "c"], null], noData,
    ["match", ["feature-state", "c"], ...colors.flatMap((c, i) => [i, c]), noData],
  ];
}

/** Fill, outline and hover/selection outline for one geography level. */
export function thematicLayers(o: ThematicLayerOptions): LayerSpecification[] {
  const m = THEMES[o.theme].map;
  const { minzoom, maxzoom } = o.zooms ?? GEO_LEVELS[o.level];
  const base = { source: o.source, "source-layer": o.sourceLayer, minzoom, maxzoom };
  const fillColor = choroplethFill(o.colors, o.theme);
  return [
    { id: `${o.level}-fill`, type: "fill", ...base, paint: { "fill-color": fillColor as never, "fill-opacity": 0.92 } },
    {
      id: `${o.level}-outline`, type: "line", ...base,
      paint: { "line-color": m.featureOutline, "line-width": zoomInterp(SIZE.featureOutline) as never, "line-opacity": 0.7 },
    },
    {
      id: `${o.level}-highlight`, type: "line", ...base,
      paint: {
        "line-color": m.highlight,
        "line-width": zoomInterp(SIZE.highlightOutline) as never,
        "line-opacity": ["case", ["any", ["boolean", ["feature-state", "hover"], false], ["boolean", ["feature-state", "selected"], false]], 1, 0],
      },
    },
  ];
}

export interface FeatureLineOptions {
  id: string;
  source: string;
  sourceLayer: string;
  valueField: string;
  /** Interior class breaks (n-1) and the n ramp colors. */
  breaks: number[];
  colors: string[];
  rankField?: string | null;
  theme: ThemeName;
}

/**
 * Line ramps run light → dark, which suits light land. On dark land the darkest (highest) class
 * sinks into the background and the quietest roads glow, so dark themes reverse the ramp:
 * the highest class is always the one that stands out. Map layers and legends both use this.
 */
export function featureLineColors(colors: string[], theme: ThemeName): string[] {
  return theme === "dark" ? [...colors].reverse() : colors;
}

/** Cased lines colored by value class and sized by zoom × rank. Busier segments draw on top. */
export function featureLineLayers(o: FeatureLineOptions): LayerSpecification[] {
  const m = THEMES[o.theme].map;
  const value = ["to-number", ["get", o.valueField], 0];
  const colors = featureLineColors(o.colors, o.theme);
  const color = ["step", value, colors[0], ...o.breaks.flatMap((b, i) => [b, colors[i + 1]])];
  const width = (extra: number) => [
    "interpolate", ["linear"], ["zoom"],
    ...SIZE.dataLine.flatMap(([z, w]) => [z, o.rankField
      ? ["+", extra, ["*", w, ["match", ["to-number", ["get", o.rankField], 7], ...Object.entries(RANK_WIDTH).flatMap(([r, k]) => [Number(r), k]), 0.6]]]
      : w + extra]),
  ];
  const base = { source: o.source, "source-layer": o.sourceLayer };
  const layout = { "line-cap": "round" as const, "line-join": "round" as const, "line-sort-key": value as never };
  return [
    { id: `${o.id}-casing`, type: "line", ...base, layout, paint: { "line-color": m.featureOutline, "line-opacity": 0.75, "line-width": width(1.2) as never } },
    { id: `${o.id}-line`, type: "line", ...base, layout, paint: { "line-color": color as never, "line-width": width(0) as never } },
  ];
}

/** U.S. land a step lighter than the rest of the continent, from the state tiles. */
export function focusLandLayer(source: string, theme: ThemeName): LayerSpecification {
  return { id: "us-focus-land", type: "fill", source, "source-layer": "state", paint: { "fill-color": THEMES[theme].map.focusLand } };
}

export interface FeaturePolygonOptions extends FeatureLineOptions {}

/** Areas from their own geometry (e.g. CEJST tracts): step color by value, thin outline. */
export function featurePolygonLayers(o: FeaturePolygonOptions): LayerSpecification[] {
  const m = THEMES[o.theme].map;
  const value = ["to-number", ["get", o.valueField], 0];
  const color = ["step", value, o.colors[0], ...o.breaks.flatMap((b, i) => [b, o.colors[i + 1]])];
  const base = { source: o.source, "source-layer": o.sourceLayer };
  return [
    { id: `${o.id}-fill`, type: "fill", ...base, paint: { "fill-color": color as never, "fill-opacity": 0.85 } },
    { id: `${o.id}-casing`, type: "line", ...base, paint: { "line-color": m.featureOutline, "line-width": zoomInterp(SIZE.featureOutline) as never, "line-opacity": 0.6 } },
  ];
}
