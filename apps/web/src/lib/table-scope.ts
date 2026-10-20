import type { GeoLevel } from "@webgis/design";

/** What "View as table" lists (issue #293): the map's level, for the focused area only. Tracts and
 *  block groups need a focus (`in=`), so national zoom keeps counties. */
export function tableScope(level: GeoLevel, available: GeoLevel[], focus: string | null): { level: GeoLevel | null; within: string | null } {
  if (level === "state" || level === "county") return { level, within: focus };
  if (focus && (level === "tract" || level === "block_group")) return { level, within: focus };
  // shortcut: an MPO focus (`mpo=`) has no GEOID prefix, so its table still lists counties; add its county list to cover it.
  return { level: available.includes("county") ? "county" : null, within: null };
}
