// Zoom-dependent sizing, label rules and geography-level zoom bands, as plain
// values plus MapLibre expressions built from them.

/** Geography levels and their zoom bands (min inclusive, max exclusive) on a map
 *  BAND_REFERENCE_WIDTH px across; `bandShift` moves them for other screens. "Switch with zoom"
 *  is the default for every dataset (Robbie, 2026-10-02, D-132): states at the national view,
 *  counties at multi-state and regional zoom, tracts over a metro, block groups inside a city,
 *  blocks at neighborhood zoom. `pinFloor`: a level never draws below this zoom, even when the
 *  visitor pins it (no block groups or blocks at national or multi-state zoom); the finest
 *  coarser level without a floor stands in. */
export const GEO_LEVELS = {
  state: { label: "State", minzoom: 0, maxzoom: 4.6 },
  county: { label: "County", minzoom: 4.6, maxzoom: 8.5 },
  tract: { label: "Census tract", minzoom: 8.5, maxzoom: 11 },
  /** ACS publishes most tables here; values live only in static exports (D-124). */
  block_group: { label: "Block group", minzoom: 11, maxzoom: 13, pinFloor: 7 },
  /** 2020 Census only; values are baked into the block tiles, not joined (D-124). */
  block: { label: "Block", minzoom: 13, maxzoom: 24, pinFloor: 7 },
} as const;
/** Levels too large for the database (500 MB free tier): values are static files only. */
export const STATIC_ONLY_LEVELS: ReadonlySet<GeoLevel> = new Set(["block_group", "block"]);
/** Levels whose values are properties in the tiles (colored by expression, not feature state). */
export const TILE_VALUE_LEVELS: ReadonlySet<GeoLevel> = new Set(["block"]);
/** Levels whose values load only when they're about to be drawn. */
export const LAZY_LEVELS: ReadonlySet<GeoLevel> = new Set(["tract", "block_group"]);
export type GeoLevel = keyof typeof GEO_LEVELS;
export type ZoomBand = { minzoom: number; maxzoom: number };
export type LevelBands = Partial<Record<GeoLevel, ZoomBand>>;

/** The map width (px) the GEO_LEVELS bands are tuned for: a 1440 × 900 desktop, where the lower
 *  48 fill the screen at about z4.1. */
export const BAND_REFERENCE_WIDTH = 1440;
/** The lower 48's width-to-height ratio in Web Mercator: a taller-than-wide map fits them by width. */
const CONUS_ASPECT = 1.8;

/** Zoom offset for a map of this size, so a level covers the same ground on any screen: a phone
 *  (390 px) sees the whole country about 2 zooms lower than a desktop, so its bands start ~2
 *  lower. Quarter-zoom steps, so resizing doesn't re-band the map on every pixel. */
export function bandShift(width: number, height: number): number {
  const fit = Math.min(width, height * CONUS_ASPECT);
  if (!(fit > 0)) return 0;
  const s = Math.round(Math.log2(fit / BAND_REFERENCE_WIDTH) * 4) / 4;
  return Math.max(-2, Math.min(1, s)) || 0;
}

function floorOf(l: GeoLevel): number {
  const g = GEO_LEVELS[l] as { pinFloor?: number };
  return g.pinFloor ?? 0;
}

/** "Switch with zoom" bands for the levels a dataset actually has: the coarsest available level
 *  reaches down to zoom 0, the finest up to max, and a missing level's band goes to its coarser
 *  neighbor. A county-only dataset therefore shows counties at every zoom. */
export function levelBands(available: GeoLevel[], shift = 0): LevelBands {
  const order = (Object.keys(GEO_LEVELS) as GeoLevel[]).filter((l) => available.includes(l));
  const out: LevelBands = {};
  order.forEach((l, i) => {
    out[l] = {
      minzoom: i === 0 ? 0 : GEO_LEVELS[l].minzoom + shift,
      maxzoom: i === order.length - 1 ? 24 : GEO_LEVELS[order[i + 1]].minzoom + shift,
    };
  });
  return out;
}

/** A pinned level at every zoom, except below its `pinFloor`: there the finest coarser level
 *  without a floor draws instead (pinned block groups show tracts at the national view). */
export function pinnedBands(available: GeoLevel[], pinned: GeoLevel, shift = 0): LevelBands {
  const floor = floorOf(pinned);
  if (!floor) return { [pinned]: { minzoom: 0, maxzoom: 24 } };
  const order = (Object.keys(GEO_LEVELS) as GeoLevel[]).filter((l) => available.includes(l));
  const stand = order.slice(0, order.indexOf(pinned)).reverse().find((l) => !floorOf(l));
  if (!stand) return { [pinned]: { minzoom: 0, maxzoom: 24 } };
  return { [stand]: { minzoom: 0, maxzoom: floor + shift }, [pinned]: { minzoom: floor + shift, maxzoom: 24 } };
}

export function levelAtZoom(bands: LevelBands, zoom: number): GeoLevel | null {
  for (const [l, b] of Object.entries(bands) as Array<[GeoLevel, ZoomBand]>) if (zoom >= b.minzoom && zoom < b.maxzoom) return l;
  return null;
}

/** [zoom, value] pairs, interpolated linearly. */
export const SIZE = {
  featureOutline: [[3, 0.2], [6, 0.4], [10, 0.8], [14, 1.2]],
  /** Outline opacity for small areas (tracts and finer): at national zooms thousands of
   *  outlines would wash the fills out, so they fade in as areas grow (D-35). */
  fineOutlineOpacity: [[5, 0], [8, 0.7]],
  highlightOutline: [[3, 1.5], [10, 2.5], [14, 3]],
  line: [[4, 0.6], [8, 1.2], [12, 2.5], [16, 5]],
  lineMajor: [[4, 1], [8, 2], [12, 4], [16, 8]],
  point: [[4, 2], [8, 3.5], [12, 6], [16, 9]],
  /** Data lines (feature layers), before the per-rank multiplier. */
  dataLine: [[3, 0.5], [6, 1], [9, 1.8], [12, 3.2], [16, 7]],
  interstate: [[4, 0.6], [6, 1], [9, 1.8], [12, 3], [16, 6]],
  interstateCasing: [[4, 1.6], [6, 2.4], [9, 3.6], [12, 5.4], [16, 9]],
  river: [[3, 0.6], [6, 1], [9, 1.6], [12, 2.6], [16, 5]],
  riverCasing: [[3, 1.4], [6, 2], [9, 3], [12, 4.4], [16, 7.5]],
  pointStroke: [[4, 0.5], [12, 1], [16, 1.5]],
} as const satisfies Record<string, ReadonlyArray<readonly [number, number]>>;

/** Width multiplier by rank (1 = most important, e.g. Interstate). */
export const RANK_WIDTH: Record<number, number> = { 1: 1.7, 2: 1.45, 3: 1.2, 4: 1, 5: 0.8, 6: 0.7, 7: 0.6 };

export const LABEL = {
  font: ["Noto Sans Regular"],
  fontBold: ["Noto Sans Bold"],
  haloWidth: 1.4,
  sizes: {
    country: [[2, 11], [6, 16]],
    state: [[3, 10], [6, 14]],
    city: [[4, 10], [8, 13], [12, 16]],
    /** Cities outside the U.S.: a step smaller at every zoom. */
    foreign: [[5, 9], [8, 11], [12, 13]],
    stateForeign: [[4, 8.5], [6, 10.5]],
    place: [[10, 10], [14, 13]],
  },
  /** Foreign cities with OpenMapTiles rank ≤ this show from z5 (Toronto, Monterrey, Tijuana…);
   *  the rest of the cities wait for z8. */
  foreignMajorRank: 4,
  /** Minimum on-screen spacing between repeated line labels, px. */
  symbolSpacing: 300,
} as const;

export const MOTION = {
  /** ms; collapsed to 0 when the user prefers reduced motion. */
  fly: 900,
  fade: 150,
};

export function zoomInterp(stops: ReadonlyArray<readonly [number, number]>): unknown[] {
  return ["interpolate", ["linear"], ["zoom"], ...stops.flat()];
}
