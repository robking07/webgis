// Getting around (issue #202): the U.S. regions the map can jump to, and whether the U.S. is still
// on screen (else the map offers "Back to the US").
import type { Bbox } from "@/components/map/MapView";

/** [west, south, east, north]. The Aleutians past 180° are left out of Alaska's box. */
export const REGIONS = [
  { id: "lower48", label: "Lower 48", bbox: [-124.8, 24.4, -66.9, 49.4] },
  { id: "alaska", label: "Alaska", bbox: [-179.2, 51.2, -129.9, 71.5] },
  { id: "hawaii", label: "Hawaii", bbox: [-160.3, 18.9, -154.8, 22.3] },
  { id: "puerto_rico", label: "Puerto Rico", bbox: [-67.3, 17.9, -65.2, 18.6] },
] as const satisfies ReadonlyArray<{ id: string; label: string; bbox: Bbox }>;
/** The normal U.S. view: the lower 48 framed to the screen. */
export const CONUS: Bbox = [...REGIONS[0].bbox];

// Web Mercator, as fractions of the world's width (MapLibre's tiles are 512 px).
const mx = (lon: number) => (lon + 180) / 360;
const my = (lat: number) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;

/** False when zoomed far out (the whole world fits in half the screen width, so desktops show it
 *  twice) or when no U.S. region is on screen. */
export function usInView(at: { lon: number; lat: number; zoom: number }, width: number, height: number): boolean {
  const world = 512 * 2 ** at.zoom;
  if (world < 2 * width) return false;
  const hw = width / 2 / world, hh = height / 2 / world;
  const cx = mx(at.lon), cy = my(at.lat);
  return REGIONS.some(({ bbox: [w, s, e, n] }) =>
    my(n) < cy + hh && my(s) > cy - hh &&
    // The view may sit a world-copy to either side of the region.
    [-1, 0, 1].some((k) => mx(w) + k < cx + hw && mx(e) + k > cx - hw));
}
