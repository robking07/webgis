// Every dataset's value for one place, and the place's geography, from static files beside the
// tiles (R2 in production, the /tiles link locally). No database call from the browser (S1, S2):
//  - states and counties: details/<state fips>.json, one file per state holding the state and its
//    counties, values and geography (`ingest details`);
//  - tract values: values/tracts/<county fips>.json (D-113);
//  - tract geography (name, point, land area): geo/tracts/<county fips>.json (`ingest tract-geo`, #106).
import { staticUrl, TILES_BASE } from "./static-files";

export type Detail = Record<string, { value: number | null; moe: number | null }>;
export interface Geography { geoid: string; level: "state" | "county" | "tract"; name: string; lon: number; lat: number; aland_sqmi: number }

/** One state's file, as `ingest details` writes it. */
export type DetailShard = Record<string, {
  name: string; lon: number; lat: number; aland_sqmi: number;
  values: Record<string, [number | null, number | null]>;
}>;
type TractShard = Record<string, Record<string, [number | null, number | null]>>;
/** One county's tracts, as `ingest tract-geo` writes them: { "<6-digit code>": [name, lon, lat, land sq mi] }. */
export type TractGeoShard = Record<string, [string, number, number, number]>;

export { TILES_BASE };
export const detailUrl = (geoid: string) => staticUrl(`details/${geoid.slice(0, 2)}.json`);
export const tractUrl = (geoid: string) => staticUrl(`values/tracts/${geoid.slice(0, 5)}.json`);
export const tractGeoUrl = (geoid: string) => staticUrl(`geo/tracts/${geoid.slice(0, 5)}.json`);

export function detailFromShard(shard: DetailShard | null, geoid: string): Detail {
  const place = shard?.[geoid];
  if (!place) return {};
  return Object.fromEntries(Object.entries(place.values).map(([id, [value, moe]]) => [id, { value, moe }]));
}

export function geographyFromShard(shard: DetailShard | null, geoid: string): Geography | null {
  const place = shard?.[geoid];
  if (!place) return null;
  return { geoid, level: geoid.length === 2 ? "state" : "county", name: place.name, lon: place.lon, lat: place.lat, aland_sqmi: place.aland_sqmi };
}

export function geographyFromTractShard(shard: TractGeoShard | null, geoid: string): Geography | null {
  const t = shard?.[geoid.slice(5)];
  return t ? { geoid, level: "tract", name: t[0], lon: t[1], lat: t[2], aland_sqmi: t[3] } : null;
}

export function detailFromTractShard(shard: TractShard | null, geoid: string): Detail {
  const tract = geoid.slice(5), out: Detail = {};
  for (const [id, rows] of Object.entries(shard ?? {})) if (rows[tract]) out[id] = { value: rows[tract][0], moe: rows[tract][1] };
  return out;
}

// One fetch per state (or county, for tracts) per page view; a missing file means no data (null).
const cache = new Map<string, Promise<unknown>>();
function loadJson<T>(url: string, what: string): Promise<T | null> {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((r) => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`${what} couldn't be loaded (${r.status})`);
      return r.json();
    }).catch((e) => { cache.delete(url); throw e; }));
  }
  return cache.get(url) as Promise<T | null>;
}

export async function fetchDetail(geoid: string): Promise<Detail> {
  if (geoid.length === 11) return detailFromTractShard(await loadJson<TractShard>(tractUrl(geoid), "Tract data"), geoid);
  if (geoid.length !== 2 && geoid.length !== 5) return {};
  return detailFromShard(await loadJson<DetailShard>(detailUrl(geoid), "Place data"), geoid);
}

export async function fetchGeography(geoid: string): Promise<Geography | null> {
  if (geoid.length === 2 || geoid.length === 5) return geographyFromShard(await loadJson<DetailShard>(detailUrl(geoid), "Place data"), geoid);
  if (geoid.length === 11) return geographyFromTractShard(await loadJson<TractGeoShard>(tractGeoUrl(geoid), "Tract geography"), geoid);
  return null;
}
