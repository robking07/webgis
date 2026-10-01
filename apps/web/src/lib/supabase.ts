import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Read-only public client (RLS allows SELECT only). Null if env isn't configured. */
export const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export async function fetchDetail(geoid: string): Promise<Record<string, { value: number | null; moe: number | null }>> {
  if (!supabase) return {};
  const { data, error } = await supabase.from("dataset_values").select("dataset_id, value, moe").eq("geoid", geoid);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.dataset_id, { value: r.value, moe: r.moe }]));
}

export interface Geography { geoid: string; level: "state" | "county" | "tract"; name: string; lon: number; lat: number; aland_sqmi: number }

export async function fetchGeography(geoid: string): Promise<Geography | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("geographies").select("geoid, level, name, lon, lat, aland_sqmi").eq("geoid", geoid).maybeSingle();
  if (error) throw error;
  return data as Geography | null;
}
