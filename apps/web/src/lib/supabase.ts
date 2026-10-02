import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Read-only public client (RLS allows SELECT only). Null if env isn't configured. */
export const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

type Detail = Record<string, { value: number | null; moe: number | null }>;

/** Every dataset's value for one place. Tracts come from the static per-county file
 *  (values/tracts/<county>.json, D-113); states and counties from the database. */
export async function fetchDetail(geoid: string): Promise<Detail> {
  if (geoid.length === 11) return fetchTractDetail(geoid);
  if (!supabase) return {};
  const { data, error } = await supabase.from("dataset_values").select("dataset_id, value, moe").eq("geoid", geoid);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.dataset_id, { value: r.value, moe: r.moe }]));
}

async function fetchTractDetail(geoid: string): Promise<Detail> {
  const r = await fetch(`/data/values/tracts/${geoid.slice(0, 5)}.json`);
  if (r.status === 404) return {};
  if (!r.ok) throw new Error(`Tract data couldn't be loaded (${r.status})`);
  const shard = (await r.json()) as Record<string, Record<string, [number | null, number | null]>>;
  const tract = geoid.slice(5);
  const out: Detail = {};
  for (const [id, rows] of Object.entries(shard)) if (rows[tract]) out[id] = { value: rows[tract][0], moe: rows[tract][1] };
  return out;
}

export interface Geography { geoid: string; level: "state" | "county" | "tract"; name: string; lon: number; lat: number; aland_sqmi: number }

export async function fetchGeography(geoid: string): Promise<Geography | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("geographies").select("geoid, level, name, lon, lat, aland_sqmi").eq("geoid", geoid).maybeSingle();
  if (error) throw error;
  return data as Geography | null;
}
