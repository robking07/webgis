// Place search index (exported by ingest `search`): states, counties, and Gazetteer
// cities/towns/communities, plus Metropolitan Planning Organizations (issue #276) from the site's own
// /mpo/index.json, and metro and micro areas (issue #332, areas/index.json). Loaded the first time search
// (or the table) needs it. Cities and metros carry a tagged code ("place2743000", "cbsa33460") in the geoid
// slot, never read as a GEOID: their published numbers and outline are in areas/<code>.json.
import type { Geometry } from "geojson";
import type { GeoLevel } from "@webgis/design";
import { staticUrl } from "@/lib/static-files";

export type Bbox = [number, number, number, number];
/** [name, kind, geoid ("" for cities), lon, lat, land sq mi]; MPO rows (kind "MPO", their id in the
 *  geoid slot) add the states they cover ("ND, MN") and their bbox. */
export type PlaceRow = [string, string, string, number, number, number, string?, Bbox?];
export interface Mpo { id: string; states: string; bbox: Bbox }
export interface PlaceHit { name: string; kind: string; geoid: string | null; level: GeoLevel | null; lon: number; lat: number; sqmi: number; mpo?: Mpo; area?: string }
/** A city's or metro's tagged code (issue #332). */
export const AREA_CODE = /^(place\d{7}|cbsa\d{5})$/;
const isMetro = (kind: string) => kind === "Metro area" || kind === "Micro area";

const json = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`${url} → ${r.status}`); return r.json(); });
let cache: Promise<PlaceRow[]> | null = null;
/** MPOs and metros are optional: if their file fails, search still finds every other place. */
export const loadPlaceIndex = () => (cache ??= Promise.all([json(staticUrl("geo/search.json")), json("/mpo/index.json").catch(() => []), json(staticUrl("areas/index.json")).catch(() => [])])
  .then(([places, mpos, metros]: PlaceRow[][]) => [...places, ...mpos, ...metros]).catch((e) => { cache = null; throw e; }));

export const toHit = (r: PlaceRow): PlaceHit => r[1] === "MPO" ? {
  name: r[0], kind: r[1], geoid: null, level: null, lon: r[3], lat: r[4], sqmi: r[5], mpo: { id: r[2], states: r[6]!, bbox: r[7]! },
} : AREA_CODE.test(r[2]) ? {
  name: r[0], kind: r[1], geoid: null, level: null, lon: r[3], lat: r[4], sqmi: r[5], area: r[2],
} : {
  name: r[0], kind: r[1], geoid: r[2] || null,
  level: r[1] === "State" ? "state" : r[1] === "County" ? "county" : null,
  lon: r[3], lat: r[4], sqmi: r[5],
};

const ABBR: Record<string, string> = { st: "saint", ste: "sainte", mt: "mount", ft: "fort" };
/** "St. Paul", "St Paul" and "Saint Paul" all become "saint paul" (query and index alike). A word is only
 *  expanded once something follows it, so a half-typed "st" still matches Stillwater. */
export const normalizeName = (s: string) => s.toLowerCase().replace(/[–—]/g, "-").replace(/\b(st|ste|mt|ft)\.?(?=[\s,])/g, (_, a) => ABBR[a]);
// shortcut: one hand-written alias; add more here only if people really search them.
const ALIASES: Record<string, string> = { "twin cities": "metropolitan council" };

/** Prefix matches first (states, then counties, then cities, then MPOs, then other places, larger first),
 *  then word matches. Counties fill at most half the list while places also match: a short prefix
 *  like "Du" matches dozens of rural counties, which used to crowd out Duluth (issue #258). */
export function searchPlaces(rows: PlaceRow[], q: string, limit = 6): PlaceHit[] {
  const raw = q.trim().toLowerCase();
  if (raw.length < 2) return [];
  // "Minneapolis metro" (or "… micro area"): the name before the kind word, metros listed first.
  const metroWord = raw.match(/^(.+?)\s+(metro|micro)(\s+area)?$/);
  const t = ALIASES[raw] ?? normalizeName(metroWord?.[1] ?? raw);
  const kindWord = /^mpo\b/.test(raw); // "MPO" lists the MPOs first, ahead of Emporia and Lompoc
  const rank = (r: PlaceRow) => (kindWord && r[1] === "MPO" ? -1 : metroWord && isMetro(r[1]) ? -1 : r[1] === "State" ? 0 : r[1] === "County" ? 1 : r[1] === "City" ? 2 : isMetro(r[1]) ? 3 : r[1] === "MPO" ? 3 : 4);
  const prefix: PlaceRow[] = [], word: PlaceRow[] = [];
  for (const r of rows) {
    // An MPO also matches its kind, so "MPO" lists them.
    const full = r[1] === "MPO" ? r[0] + " mpo" : r[0];
    const n = normalizeName(full + ","), o = full.toLowerCase();
    if (n.startsWith(t) || o.startsWith(raw) || (kindWord && r[1] === "MPO")) prefix.push(r);
    else if (n.includes(t) || o.includes(raw)) word.push(r);
  }
  const order = (a: PlaceRow, b: PlaceRow) => rank(a) - rank(b) || b[5] - a[5];
  const countyCap = Math.max(Math.ceil(limit / 2), limit - prefix.filter((r) => r[1] !== "County").length);
  let counties = 0;
  const top = prefix.sort(order).filter((r) => r[1] !== "County" || counties++ < countyCap);
  return [...top, ...word.sort(order)].slice(0, limit).map(toHit);
}

/** ZIP → county geoid (geo/zips.json, from ingest `search`). Fetched only when a 5-digit ZIP is typed.
 *  shortcut: the county holding most of the ZIP's land, not the city; upgrade if a ZIP-to-city file is added. */
let zips: Promise<Record<string, string>> | null = null;
export const countyForZip = (zip: string) => (zips ??= json(staticUrl("geo/zips.json")).catch((e) => { zips = null; throw e; })).then((z) => z[zip] ?? null);

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
/** Each MPO's counties with the share of their residents inside it (#292; ingest `mpo-counties`). */
type MpoCounties = Record<string, Array<[string, number]>>;
let mpoCounties: Promise<MpoCounties> | null = null;
export const loadMpoCounties = (): Promise<MpoCounties> => (mpoCounties ??= json("/mpo/counties.json").catch((e) => { mpoCounties = null; throw e; }));

export function areaByCode(rows: PlaceRow[], code: string): PlaceHit | null {
  const r = rows.find((x) => x[2] === code);
  return r ? toHit(r) : null;
}
/** A city's or metro's file (ingest `areas`): each opted-in map's published [value, margin], its outline and bbox. */
export type AreaFile = { v: Record<string, [number | null, number | null]>; g: Geometry; b: Bbox };
export const loadArea = (code: string): Promise<AreaFile> => json(staticUrl(`areas/${code}.json`));

/** A zoom that fits an area of this size, with some context, into `px` of free map (512 px tiles). */
export function zoomForArea(sqmi: number, px = 1000): number {
  const widthDeg = Math.sqrt(Math.max(sqmi, 0.5) * 2.59) / 111;
  return Math.min(12, Math.max(2, Math.log2((Math.max(px, 160) * 360) / (512 * 2.2 * widthDeg))));
}
