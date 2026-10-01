import type { GeoLevel } from "@webgis/design";

/** Level from GEOID length: 2 = state, 5 = county, 11 = tract. */
export function levelOfGeoid(geoid: string): GeoLevel | null {
  return ({ 2: "state", 5: "county", 11: "tract" } as Record<number, GeoLevel>)[geoid.length] ?? null;
}
export const LEVEL_PLURAL: Record<GeoLevel, string> = { state: "states", county: "counties", tract: "tracts" };
/** Map zoom to open a place at, per level. */
export const PLACE_ZOOM: Record<GeoLevel, number> = { state: 5.5, county: 8, tract: 12 };
export const placeHref = (geoid: string) => `/place/${geoid}`;

/** "Ranks higher than 39 of 52 states" — count of places at this level with a lower value. */
export function rankText(values: Record<string, number> | undefined, v: number | null | undefined, level: GeoLevel): string | null {
  if (!values || v == null) return null;
  const all = Object.values(values);
  if (all.length < 2) return null;
  const lower = all.filter((w) => w < v).length;
  return `Ranks higher than ${lower.toLocaleString()} of ${all.length.toLocaleString()} ${LEVEL_PLURAL[level]}`;
}
