import type { GeoLevel } from "@webgis/design";

/** Level from GEOID length: 2 = state, 5 = county, 11 = tract, 12 = block group. */
export function levelOfGeoid(geoid: string): GeoLevel | null {
  return ({ 2: "state", 5: "county", 11: "tract", 12: "block_group", 15: "block" } as Record<number, GeoLevel>)[geoid.length] ?? null;
}
export const LEVEL_PLURAL: Record<GeoLevel, string> = { state: "states", county: "counties", tract: "tracts", block_group: "block groups", block: "blocks" };
/** Map zoom to open a place at, per level. */
export const PLACE_ZOOM: Record<GeoLevel, number> = { state: 5.5, county: 8, tract: 12, block_group: 13.5, block: 15 };
export const placeHref = (geoid: string) => `/place/${geoid}`;

/**
 * "Ranks higher than 39 of 52 states" — count of places at this level with a lower value.
 * The ends read plainly instead of "Ranks higher than 0 of 3,222": "Lowest of 52 states",
 * "Tied for the lowest value with 2,900 other counties", and the same for the highest.
 */
export function rankText(values: Record<string, number> | undefined, v: number | null | undefined, level: GeoLevel): string | null {
  if (!values || v == null) return null;
  const all = Object.values(values);
  if (all.length < 2) return null;
  const n = all.length, plural = LEVEL_PLURAL[level];
  const lower = all.filter((w) => w < v).length;
  const others = all.filter((w) => w === v).length - 1;
  if (lower === 0) return others > 0 ? `Tied for the lowest value with ${others.toLocaleString()} other ${plural}` : `Lowest of ${n.toLocaleString()} ${plural}`;
  if (lower + others === n - 1) return others > 0 ? `Tied for the highest value with ${others.toLocaleString()} other ${plural}` : `Highest of ${n.toLocaleString()} ${plural}`;
  return `Ranks higher than ${lower.toLocaleString()} of ${n.toLocaleString()} ${plural}`;
}

/** Names the way the site writes them: DC's county reads "District of Columbia", tracts "Census tract 101, ...". */
export const tidyPlaceName = (n: string) => (n === "District of Columbia, DC" ? "District of Columbia" : n.replace(/^Tract /, "Census tract "));
