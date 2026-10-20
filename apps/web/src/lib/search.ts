// Place search index (exported by ingest `search`): states, counties, and Gazetteer
// cities/towns/communities, plus Metropolitan Planning Organizations (issue #276) from the site's own
// /mpo/index.json. Loaded the first time search (or the table) needs it.
import type { GeoLevel } from "@webgis/design";
import { staticUrl } from "@/lib/static-files";

export type Bbox = [number, number, number, number];
/** [name, kind, geoid ("" for cities), lon, lat, land sq mi]; MPO rows (kind "MPO", their id in the
 *  geoid slot) add the states they cover ("ND, MN") and their bbox. */
export type PlaceRow = [string, string, string, number, number, number, string?, Bbox?];
export interface Mpo { id: string; states: string; bbox: Bbox }
export interface PlaceHit { name: string; kind: string; geoid: string | null; level: GeoLevel | null; lon: number; lat: number; sqmi: number; mpo?: Mpo }

const json = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`${url} → ${r.status}`); return r.json(); });
let cache: Promise<PlaceRow[]> | null = null;
/** MPOs are optional: if their file fails, search still finds every other place. */
export const loadPlaceIndex = () => (cache ??= Promise.all([json(staticUrl("geo/search.json")), json("/mpo/index.json").catch(() => [])])
  .then(([places, mpos]: PlaceRow[][]) => [...places, ...mpos]).catch((e) => { cache = null; throw e; }));

const toHit = (r: PlaceRow): PlaceHit => r[1] === "MPO" ? {
  name: r[0], kind: r[1], geoid: null, level: null, lon: r[3], lat: r[4], sqmi: r[5], mpo: { id: r[2], states: r[6]!, bbox: r[7]! },
} : {
  name: r[0], kind: r[1], geoid: r[2] || null,
  level: r[1] === "State" ? "state" : r[1] === "County" ? "county" : null,
  lon: r[3], lat: r[4], sqmi: r[5],
};

/** Prefix matches first (states, then counties, then cities, then MPOs, then other places, larger first),
 *  then word matches. Counties fill at most half the list while places also match: a short prefix
 *  like "Du" matches dozens of rural counties, which used to crowd out Duluth (issue #258). */
export function searchPlaces(rows: PlaceRow[], q: string, limit = 6): PlaceHit[] {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  const rank = (r: PlaceRow) => (r[1] === "State" ? 0 : r[1] === "County" ? 1 : r[1] === "City" ? 2 : r[1] === "MPO" ? 3 : 4);
  const prefix: PlaceRow[] = [], word: PlaceRow[] = [];
  for (const r of rows) {
    // An MPO also matches its kind, so "MPO" lists them.
    const n = (r[1] === "MPO" ? r[0] + " mpo" : r[0]).toLowerCase();
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
  const r = rows.find((x) => x[2] === geoid && x[1] !== "MPO");
  return r ? toHit(r) : null;
}

export function mpoById(rows: PlaceRow[], id: string): PlaceHit | null {
  const r = rows.find((x) => x[1] === "MPO" && x[2] === id);
  return r ? toHit(r) : null;
}

/** An MPO's shape (one small GeoJSON geometry, fetched only when it's picked). */
export const loadMpoShape = (id: string) => json("/mpo/" + id + ".json");

/** A zoom that fits an area of this size, with some context, into `px` of free map (512 px tiles). */
export function zoomForArea(sqmi: number, px = 1000): number {
  const widthDeg = Math.sqrt(Math.max(sqmi, 0.5) * 2.59) / 111;
  return Math.min(12, Math.max(2, Math.log2((Math.max(px, 160) * 360) / (512 * 2.2 * widthDeg))));
}
