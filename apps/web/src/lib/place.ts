import type { GeoLevel } from "@webgis/design";

/** Level from GEOID length: 2 = state, 5 = county, 11 = tract, 12 = block group. */
export function levelOfGeoid(geoid: string): GeoLevel | null {
  return ({ 2: "state", 5: "county", 11: "tract", 12: "block_group", 15: "block" } as Record<number, GeoLevel>)[geoid.length] ?? null;
}
export const LEVEL_PLURAL: Record<GeoLevel, string> = { state: "states", county: "counties", tract: "tracts", block_group: "block groups", block: "blocks" };
/** Map zoom to open a place at, per level. */
export const PLACE_ZOOM: Record<GeoLevel, number> = { state: 5.5, county: 8, tract: 12, block_group: 13.5, block: 15 };
/** `d`: the map's dataset, carried so the profile's "Back to the map" returns to the map you came from. */
export const placeHref = (geoid: string, d?: string | null) => `/place/${geoid}${d ? `?d=${encodeURIComponent(d)}` : ""}`;

/** Race and ethnicity numbers never stand out on their own (site rule, 2026-10-29, #414): no rank line, no "both high/low". */
export const isRaceRow = (d?: { subcategory?: string }) => d?.subcategory === "Race and ethnicity";

/**
 * "Higher than in 39 of the 50 states, DC and Puerto Rico" — count of places at this level with a lower value.
 * The ends read plainly instead of "Higher than in 0 of 3,222": "Lowest of 52 states",
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
  // The 52 "states" are the 50, DC and Puerto Rico.
  const set = level === "state" && n === 52 && "11" in values && "72" in values ? "the 50 states, DC and Puerto Rico" : `${n.toLocaleString()} ${plural}`;
  return `Higher than in ${lower.toLocaleString()} of ${set}`;
}

/** The back button's words (issue #437): where Back goes, the place one step up the drill-down
 *  (`to`, its GEOID and name), or the national view when nothing is above. */
export function backLabel(to?: { geoid: string; name: string }): string {
  if (!to) return "Back to national view";
  const level = levelOfGeoid(to.geoid), name = to.name.split(",")[0];
  if (level === "tract" || level === "block_group" || level === "block") return `Back to ${LEVEL_PLURAL[level].slice(0, -1)}`;
  if (!name) return "Back to previous view"; // a shared link's name is still loading
  return level === "state" ? `Back to ${name} view` : `Back to ${name}`;
}

/** Names the way the site writes them: DC's county reads "District of Columbia", tracts "Census tract 101, ...". */
export const tidyPlaceName = (n: string) => (n === "District of Columbia, DC" ? "District of Columbia" : n.replace(/^Tract /, "Census tract "));
