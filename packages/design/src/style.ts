// Map styles built only from tokens: the basemap (OpenMapTiles schema, served by
// OpenFreeMap) and the layer stack for a thematic dataset. Data values are joined on
// the client through feature state: each feature gets `c` = its class index, so the
// same tiles serve every dataset and adding one needs no re-tiling.
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import { HATCH, THEMES, type ThemeName } from "./themes.ts";
import { LABEL, RANK_WIDTH, SECOND_OUTLINE_DASH, SIZE, zoomInterp, GEO_LEVELS, type GeoLevel } from "./sizing.ts";
import { US_LABEL_MASK } from "./us-label-mask.ts";

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
  /** True for label points inside the U.S. (OpenMapTiles places have no country code). */
  const inUS = ["within", US_LABEL_MASK] as never;
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
    // Places: U.S. cities and towns at full strength; foreign ones (outside the U.S. mask)
    // fewer, smaller and muted, so the map reads as a U.S. map (Robbie, D-37).
    {
      id: "label-place", type: "symbol", source: "omt", "source-layer": "place", minzoom: 4,
      filter: ["all", ["in", ["get", "class"], ["literal", ["city", "town"]]], inUS],
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": LABEL.font as unknown as string[],
        "text-size": zoomInterp(LABEL.sizes.city) as never,
        "symbol-sort-key": ["get", "rank"],
      },
      paint: { "text-color": m.label, ...halo },
    },
    // Foreign: only the biggest cities at first, the rest of the cities from z8, never towns.
    ...([["label-place-foreign", 5, ["<=", ["get", "rank"], LABEL.foreignMajorRank]], ["label-place-foreign-minor", 8, [">", ["get", "rank"], LABEL.foreignMajorRank]]] as const).map(([id, minzoom, rank]): LayerSpecification => ({
      id, type: "symbol", source: "omt", "source-layer": "place", minzoom,
      filter: ["all", ["==", ["get", "class"], "city"], rank, ["!", inUS]] as never,
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": LABEL.font as unknown as string[],
        "text-size": zoomInterp(LABEL.sizes.foreign) as never,
        "symbol-sort-key": ["get", "rank"],
      },
      paint: { "text-color": m.labelForeign, "text-halo-color": m.labelHalo, "text-halo-width": LABEL.haloWidth * 0.7 },
    })),
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
      filter: ["all", ["==", ["get", "class"], "state"], inUS],
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": LABEL.fontBold as unknown as string[],
        "text-size": zoomInterp(LABEL.sizes.state) as never,
        "text-transform": "uppercase",
        "text-letter-spacing": 0.08,
      },
      paint: { "text-color": m.labelMuted, ...halo },
    },
    // Provinces and Mexican states: smaller, fainter, and only once zoomed past the national view.
    {
      id: "label-state-foreign", type: "symbol", source: "omt", "source-layer": "place", minzoom: 4, maxzoom: 7,
      filter: ["all", ["==", ["get", "class"], "state"], ["!", inUS]],
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": LABEL.font as unknown as string[],
        "text-size": zoomInterp(LABEL.sizes.stateForeign) as never,
        "text-transform": "uppercase",
        "text-letter-spacing": 0.08,
      },
      paint: { "text-color": m.labelForeign, "text-halo-color": m.labelHalo, "text-halo-width": LABEL.haloWidth * 0.7, "text-opacity": 0.8 },
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

/** Which theme token fills areas without a value: change maps use their own (see themes.ts). */
export type NoDataFill = "noData" | "noDataChange";

/** Choropleth fill for small levels (states, counties): a `match` on geoid, evaluated in
 *  the tile workers. Feature state holds only hover/selected (D-114). */
export function choroplethFill(colors: string[], classes: ReadonlyMap<string, number>, theme: ThemeName, noDataFill: NoDataFill = "noData"): unknown {
  const noData = THEMES[theme].map[noDataFill];
  if (colors.length === 0 || classes.size === 0) return noData;
  const byClass: string[][] = colors.map(() => []);
  for (const [id, c] of classes) byClass[c]?.push(id);
  const branches = byClass.flatMap((ids, i) => (ids.length ? [ids, colors[i]] : []));
  return branches.length ? ["match", ["get", "geoid"], ...branches, noData] : noData;
}

/** Levels with too many areas for one expression; drawn as one fill layer per state (D-114).
 *
 *  Coloring ~240k block groups through feature state cost every new tile O(all geoids) on
 *  the main thread. A single expression doesn't work either: MapLibre copies a layer's
 *  paint expression into every tile the workers send back and keeps that copy per cached
 *  tile, so a 2 MB expression meant tens of ms of unpacking and ~5 MB of memory per tile.
 *  One layer per state, filtered by geoid prefix, carries only that state's classes, and
 *  tiles only hold the layers they have features for. */
// Typed as strings so it can name block groups before that level exists on every branch.
export const PER_STATE_LEVELS: ReadonlySet<string> = new Set(["tract", "block_group"]);
/** State FIPS codes that start tract and block-group geoids (50 states, DC, Puerto Rico). */
export const STATE_PREFIXES = [
  "01", "02", "04", "05", "06", "08", "09", "10", "11", "12", "13", "15", "16", "17", "18", "19", "20", "21",
  "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39",
  "40", "41", "42", "44", "45", "46", "47", "48", "49", "50", "51", "53", "54", "55", "56", "72",
] as const;
/** Every fill layer of a level: the base layer (hit-testing; invisible for per-state levels),
 *  then per state, then one for geoids outside STATE_PREFIXES. */
export function fillLayerIds(level: GeoLevel): string[] {
  if (!PER_STATE_LEVELS.has(level)) return [`${level}-fill`];
  return [`${level}-fill`, ...STATE_PREFIXES.map((st) => `${level}-fill-${st}`), `${level}-fill-other`];
}

/** Per-state fill colors for a per-state level: { layer id → fill-color }.
 *
 *  Within a state the classes are packed into short strings, one per class and 4-digit
 *  geoid prefix (state plus two county digits), listing the rest of each geoid between
 *  commas (",30001001,30001002,"). The expression picks the prefix's strings and tests
 *  membership with `in`, a native `indexOf`. The commas make a hit an exact match of the
 *  whole remainder, never part of a longer or neighboring id. (`index-of` and `slice`
 *  spread their whole input into an array first, so they're only used on the geoid.) */
export function choroplethFillsByState(level: GeoLevel, colors: string[], classes: ReadonlyMap<string, number>, theme: ThemeName, noDataFill: NoDataFill = "noData"): Record<string, unknown> {
  const noData = THEMES[theme].map[noDataFill];
  // state → county prefix → per-class lists of the geoid's remainder
  const byState = new Map<string, Map<string, string[][]>>();
  if (colors.length) for (const [id, c] of classes) {
    if (!(c >= 0 && c < colors.length) || id.length <= PACK_GROUP) continue;
    const st = id.slice(0, 2), k = id.slice(0, PACK_GROUP);
    let byPrefix = byState.get(st);
    if (!byPrefix) byState.set(st, (byPrefix = new Map()));
    let lists = byPrefix.get(k);
    if (!lists) byPrefix.set(k, (lists = colors.map(() => [])));
    lists[c].push(id.slice(PACK_GROUP));
  }
  const out: Record<string, unknown> = { [`${level}-fill`]: noData, [`${level}-fill-other`]: noData };
  for (const st of STATE_PREFIXES) {
    const byPrefix = byState.get(st);
    const tests = byPrefix ? colors.flatMap((color, c) => {
      const cases = [...byPrefix].flatMap(([k, lists]) => (lists[c].length ? [k, `,${lists[c].join(",")},`] : []));
      return cases.length ? [["in", ["var", "needle"], ["match", ["var", "prefix"], ...cases, ""]], color] : [];
    }) : [];
    out[`${level}-fill-${st}`] = tests.length === 0 ? noData : [
      "let", "g", ["to-string", ["get", "geoid"]],
      [
        "let", "prefix", ["slice", ["var", "g"], 0, PACK_GROUP], "needle", ["concat", ",", ["slice", ["var", "g"], PACK_GROUP], ","],
        ["case", ...tests, noData],
      ],
    ];
  }
  return out;
}
/** Geoid prefix that groups the packed strings: state plus two county digits keeps each
 *  string short (fast `in` in the workers) and the expression small (cheap to unpack). */
const PACK_GROUP = 4;

/** Reliability hatching (D-222): levels that can be hatched, the pattern image's name, and the
 *  layer id. Counties and states rarely have unreliable estimates; they aren't hatched. */
export const HATCH_LEVELS: ReadonlySet<string> = new Set(["tract", "block_group"]);
export const HATCH_IMAGE = "wg-hatch";
export const hatchLayerId = (level: GeoLevel) => `${level}-hatch`;
/** A filter that matches nothing (the hatch layer's resting state). A literal `false`: a short
 *  form like ["==", 1, 0] reads as a legacy filter and fails validation, so addLayer drops the layer. */
export const NO_FEATURES = false;

/** Filter matching exactly these geoids, packed the same way as choroplethFillsByState (one
 *  comma-delimited string per 4-digit prefix, tested with a native `in`), so a few thousand tracts
 *  or tens of thousands of block groups stay a compact expression. */
export function membershipFilter(ids: Iterable<string>): unknown {
  const byPrefix = new Map<string, string[]>();
  for (const id of ids) {
    if (id.length <= PACK_GROUP) continue;
    const k = id.slice(0, PACK_GROUP);
    let l = byPrefix.get(k);
    if (!l) byPrefix.set(k, (l = []));
    l.push(id.slice(PACK_GROUP));
  }
  if (!byPrefix.size) return NO_FEATURES;
  const cases = [...byPrefix].flatMap(([k, l]) => [k, `,${l.join(",")},`]);
  return [
    "let", "g", ["to-string", ["get", "geoid"]],
    ["in", ["concat", ",", ["slice", ["var", "g"], PACK_GROUP], ","], ["match", ["slice", ["var", "g"], 0, PACK_GROUP], ...cases, ""]],
  ];
}

/** The hatch layer for one level: the pattern over the fill (the fill's color still shows),
 *  hidden until the visitor turns reliability hatching on. */
export function hatchLayer(o: { source: string; sourceLayer: string; level: GeoLevel; zooms?: { minzoom: number; maxzoom: number } }): LayerSpecification {
  const { minzoom, maxzoom } = o.zooms ?? GEO_LEVELS[o.level];
  return {
    id: hatchLayerId(o.level), type: "fill", source: o.source, "source-layer": o.sourceLayer, minzoom, maxzoom,
    filter: NO_FEATURES as never, layout: { visibility: "none" }, paint: { "fill-pattern": HATCH_IMAGE },
  };
}

/** The hatch pattern as RGBA pixels (for map.addImage): 45° stripes, a dark stripe beside a light
 *  one, from the theme's tokens. Tiles seamlessly; `pixelRatio` keeps it sharp on dense screens. */
export function hatchImage(theme: ThemeName, pixelRatio = 1): { width: number; height: number; data: Uint8Array } {
  const m = THEMES[theme].map;
  const size = Math.max(2, Math.round(HATCH.spacing * pixelRatio));
  const w = HATCH.width * pixelRatio;
  const alpha = HATCH.opacity[theme];
  const [dark, light] = [m.hatchDark, m.hatchLight].map(rgb);
  const data = new Uint8Array(size * size * 4);
  const ss = 4; // supersampling per axis, for soft edges
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let cd = 0, cl = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      // Position across the stripes: (x + y) repeats every `size` px; ÷ √2 measures it at right angles.
      const d = ((x + (sx + 0.5) / ss + y + (sy + 0.5) / ss) % size) / Math.SQRT2;
      if (d < w) cd++; else if (d < 2 * w) cl++;
    }
    if (!(cd + cl)) continue;
    const i = (y * size + x) * 4;
    for (let k = 0; k < 3; k++) data[i + k] = Math.round((dark[k] * cd + light[k] * cl) / (cd + cl));
    data[i + 3] = Math.round(255 * alpha * (cd + cl) / (ss * ss));
  }
  return { width: size, height: size, data };
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** Geoids that start with `st` (string range, so the filter needs no `slice`). */
function stateFilter(st: string): unknown {
  const next = String(Number(st) + 1).padStart(2, "0");
  const g = ["to-string", ["get", "geoid"]];
  return ["all", [">=", g, st], ["<", g, next]];
}

/** Fill, outline and hover/selection outline for one geography level. */
export function thematicLayers(o: ThematicLayerOptions): LayerSpecification[] {
  const m = THEMES[o.theme].map;
  const { minzoom, maxzoom } = o.zooms ?? GEO_LEVELS[o.level];
  const base = { source: o.source, "source-layer": o.sourceLayer, minzoom, maxzoom };
  // No-data until syncPaint sets the level's class expression.
  const fillColor = choroplethFill(o.colors, new Map(), o.theme);
  const flag = (k: string) => ["boolean", ["feature-state", k], false];
  const shown = ["case", ["any", flag("hover"), flag("selected")], 1, 0];
  const perState = PER_STATE_LEVELS.has(o.level);
  const fills: LayerSpecification[] = [
    // Per-state levels keep this layer for hit-testing only (fills draw nothing at opacity 0).
    { id: `${o.level}-fill`, type: "fill", ...base, paint: { "fill-color": fillColor as never, "fill-opacity": perState ? 0 : 0.92 } },
  ];
  if (perState) {
    const fill = { "fill-color": THEMES[o.theme].map.noData, "fill-opacity": 0.92 };
    for (const st of STATE_PREFIXES) fills.push({ id: `${o.level}-fill-${st}`, type: "fill", ...base, filter: stateFilter(st) as never, paint: fill });
    const known = ["match", ["slice", ["to-string", ["get", "geoid"]], 0, 2], [...STATE_PREFIXES], false, true];
    fills.push({ id: `${o.level}-fill-other`, type: "fill", ...base, filter: known as never, paint: fill });
  }
  return [
    ...fills,
    ...(HATCH_LEVELS.has(o.level) ? [hatchLayer(o)] : []),
    {
      id: `${o.level}-outline`, type: "line", ...base,
      paint: { "line-color": m.featureOutline, "line-width": zoomInterp(SIZE.featureOutline) as never,
        "line-opacity": (o.level === "state" || o.level === "county" ? 0.7 : zoomInterp(SIZE.fineOutlineOpacity)) as never },
    },
    // Cased selection: a contrasting halo under the outline, so it reads on the darkest and lightest classes.
    {
      id: `${o.level}-highlight-halo`, type: "line", ...base,
      paint: { "line-color": m.highlightHalo, "line-width": zoomInterp(SIZE.highlightOutline.map(([z, w]) => [z, w + 3] as const)) as never,
        "line-opacity": ["case", ["any", flag("hover"), flag("selected"), flag("second")], 1, 0] as never },
    },
    {
      id: `${o.level}-highlight`, type: "line", ...base,
      paint: { "line-color": m.highlight, "line-width": zoomInterp(SIZE.highlightOutline) as never, "line-opacity": shown as never },
    },
    // The second place on a compare map (D-258): the same outline, dashed, over the same halo.
    {
      id: `${o.level}-highlight-second`, type: "line", ...base,
      paint: { "line-color": m.highlight, "line-width": zoomInterp(SIZE.highlightOutline) as never,
        "line-dasharray": [...SECOND_OUTLINE_DASH], "line-opacity": ["case", flag("second"), 1, 0] as never },
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
    { id: `${o.id}-casing`, type: "line", ...base, layout, paint: { "line-color": m.featureLineCasing, "line-opacity": 0.9, "line-width": width(1.2) as never } },
    { id: `${o.id}-line`, type: "line", ...base, layout, paint: { "line-color": color as never, "line-width": width(0) as never } },
  ];
}

/** U.S. land a step lighter than the rest of the continent, from the state tiles. */
export function focusLandLayer(source: string, theme: ThemeName): LayerSpecification {
  return { id: "us-focus-land", type: "fill", source, "source-layer": "state", paint: { "fill-color": THEMES[theme].map.focusLand } };
}

export interface FeaturePolygonOptions extends FeatureLineOptions {}

/**
 * Areas from their own geometry (e.g. CEJST tracts): step color by value, thin outline.
 * Such geometry is often not clipped to the shoreline (CEJST's 2010 tracts cover lakes and bays),
 * so the basemap's water and shoreline are drawn again on top as a mask.
 */
export function featurePolygonLayers(o: FeaturePolygonOptions): LayerSpecification[] {
  const m = THEMES[o.theme].map;
  const value = ["to-number", ["get", o.valueField], 0];
  const color = ["step", value, o.colors[0], ...o.breaks.flatMap((b, i) => [b, o.colors[i + 1]])];
  const base = { source: o.source, "source-layer": o.sourceLayer };
  return [
    { id: `${o.id}-fill`, type: "fill", ...base, paint: { "fill-color": color as never, "fill-opacity": 0.85 } },
    { id: `${o.id}-casing`, type: "line", ...base, paint: { "line-color": m.featureOutline, "line-width": zoomInterp(SIZE.featureOutline) as never, "line-opacity": 0.6 } },
    { id: `${o.id}-water-mask`, type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": m.water } },
    {
      id: `${o.id}-shoreline`, type: "line", source: "omt", "source-layer": "water",
      filter: ["!=", ["get", "brunnel"], "tunnel"],
      paint: { "line-color": m.coastline, "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.6, 6, 1, 12, 1.4] as never, "line-opacity": 0.9 },
    },
  ];
}
