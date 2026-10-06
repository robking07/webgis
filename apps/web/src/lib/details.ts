// Every dataset's value for one place, and the place's geography, from static files (no database
// call from the browser, S1):
//  - states and counties: details/<state fips>.json beside the tiles (R2 in production, the /tiles
//    link locally), one file per state holding the state and its counties (`ingest details`);
//  - tracts: values/tracts/<county fips>.json (D-113).
// Tract geography (name, centroid, land area) still comes from the database.
import { supabase } from "./supabase";

export type Detail = Record<string, { value: number | null; moe: number | null }>;
export interface Geography { geoid: string; level: "state" | "county" | "tract"; name: string; lon: number; lat: number; aland_sqmi: number }

/** One state's file, as `ingest details` writes it. */
export type DetailShard = Record<string, {
  name: string; lon: number; lat: number; aland_sqmi: number;
  values: Record<string, [number | null, number | null]>;
}>;
type TractShard = Record<string, Record<string, [number | null, number | null]>>;

/** Files that live with the tiles (block groups, D-124; state and county details, S1). */
export const TILES_BASE = process.env.NEXT_PUBLIC_TILES_BASE_URL || "/tiles";

export const detailUrl = (geoid: string) => `${TILES_BASE}/details/${geoid.slice(0, 2)}.json`;
export const tractUrl = (geoid: string) => `/data/values/tracts/${geoid.slice(0, 5)}.json`;

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
  if (!supabase) return null;
  const { data, error } = await supabase.from("geographies").select("geoid, level, name, lon, lat, aland_sqmi").eq("geoid", geoid).maybeSingle();
  if (error) throw error;
  return data as Geography | null;
}
