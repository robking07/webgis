// Place search index (exported by ingest `search`): states, counties, and Gazetteer
// cities/towns/communities. Loaded the first time search (or the table) needs it.
import type { GeoLevel } from "@webgis/design";
import { staticUrl } from "@/lib/static-files";

/** [name, kind, geoid ("" for cities), lon, lat, land sq mi] */
export type PlaceRow = [string, string, string, number, number, number];
export interface PlaceHit { name: string; kind: string; geoid: string | null; level: GeoLevel | null; lon: number; lat: number; sqmi: number }

let cache: Promise<PlaceRow[]> | null = null;
export const loadPlaceIndex = () => (cache ??= fetch(staticUrl("geo/search.json")).then((r) => r.json()).catch((e) => { cache = null; throw e; }));

const toHit = (r: PlaceRow): PlaceHit => ({
  name: r[0], kind: r[1], geoid: r[2] || null,
  level: r[1] === "State" ? "state" : r[1] === "County" ? "county" : null,
  lon: r[3], lat: r[4], sqmi: r[5],
});

/** Prefix matches first (states, then counties, then cities, then other places, larger first),
 *  then word matches. Counties fill at most half the list while places also match: a short prefix
 *  like "Du" matches dozens of rural counties, which used to crowd out Duluth (issue #258). */
export function searchPlaces(rows: PlaceRow[], q: string, limit = 6): PlaceHit[] {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  const rank = (r: PlaceRow) => (r[1] === "State" ? 0 : r[1] === "County" ? 1 : r[1] === "City" ? 2 : 3);
  const prefix: PlaceRow[] = [], word: PlaceRow[] = [];
  for (const r of rows) {
    const n = r[0].toLowerCase();
    if (n.startsWith(t)) prefix.push(r);
    else if (n.includes(` ${t}`) || n.includes(t)) word.push(r);
  }
  const order = (a: PlaceRow, b: PlaceRow) => rank(a) - rank(b) || b[5] - a[5];
  const countyCap = Math.max(Math.ceil(limit / 2), limit - prefix.filter((r) => r[1] !== "County").length);
  let counties = 0;
  const top = prefix.sort(order).filter((r) => r[1] !== "County" || counties++ < countyCap);
  return [...top, ...word.sort(order)].slice(0, limit).map(toHit);
}

export function placeByGeoid(rows: PlaceRow[], geoid: string): PlaceHit | null {
  const r = rows.find((x) => x[2] === geoid);
  return r ? toHit(r) : null;
}

/** A zoom that fits an area of this size, with some context, into `px` of free map (512 px tiles). */
export function zoomForArea(sqmi: number, px = 1000): number {
  const widthDeg = Math.sqrt(Math.max(sqmi, 0.5) * 2.59) / 111;
  return Math.min(12, Math.max(2, Math.log2((Math.max(px, 160) * 360) / (512 * 2.2 * widthDeg))));
}
