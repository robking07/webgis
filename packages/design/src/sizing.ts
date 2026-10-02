// Zoom-dependent sizing, label rules and geography-level zoom bands, as plain
// values plus MapLibre expressions built from them.

/** Geography levels and their default zoom band (min inclusive, max exclusive).
 *  Counties start early (Robbie, 2026-10-01: "should render at all times"); states only
 *  show at the widest, continental zooms. */
export const GEO_LEVELS = {
  state: { label: "State", minzoom: 0, maxzoom: 3 },
  county: { label: "County", minzoom: 3, maxzoom: 8.5 },
  tract: { label: "Census tract", minzoom: 8.5, maxzoom: 11 },
  /** ACS publishes most tables here; values live only in static exports (D-124). */
  block_group: { label: "Block group", minzoom: 11, maxzoom: 13 },
  /** 2020 Census only; values are baked into the block tiles, not joined (D-124). */
  block: { label: "Block", minzoom: 13, maxzoom: 24 },
} as const;
/** Levels too large for the database (500 MB free tier): values are static files only. */
export const STATIC_ONLY_LEVELS: ReadonlySet<GeoLevel> = new Set(["block_group", "block"]);
/** Levels whose values are properties in the tiles (colored by expression, not feature state). */
export const TILE_VALUE_LEVELS: ReadonlySet<GeoLevel> = new Set(["block"]);
/** Levels whose values load only when they're about to be drawn. */
export const LAZY_LEVELS: ReadonlySet<GeoLevel> = new Set(["tract", "block_group"]);
export type GeoLevel = keyof typeof GEO_LEVELS;
export type ZoomBand = { minzoom: number; maxzoom: number };

/** Zoom bands for the levels a dataset actually has: the coarsest available level reaches
 *  down to zoom 0, the finest up to max, and a missing level's band goes to its coarser
 *  neighbor. A county-only dataset therefore shows counties at every zoom. */
export function levelBands(available: GeoLevel[]): Partial<Record<GeoLevel, ZoomBand>> {
  const order = (Object.keys(GEO_LEVELS) as GeoLevel[]).filter((l) => available.includes(l));
  const out: Partial<Record<GeoLevel, ZoomBand>> = {};
  order.forEach((l, i) => {
    out[l] = {
      minzoom: i === 0 ? 0 : GEO_LEVELS[l].minzoom,
      maxzoom: i === order.length - 1 ? 24 : GEO_LEVELS[order[i + 1]].minzoom,
    };
  });
  return out;
}

export function levelAtZoom(bands: Partial<Record<GeoLevel, ZoomBand>>, zoom: number): GeoLevel | null {
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
