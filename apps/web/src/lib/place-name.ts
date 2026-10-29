// A place's name from the static names export (states and counties; tracts via their county).
// Bundled with the function (a serverless route can't count on reading files at runtime); the
// ingest's `export` step writes it to src/generated beside registry.json (S2).
import NAMES from "@/generated/names.json";
import { geographyFromTractShard, tractGeoUrl, type TractGeoShard } from "./details";
import { tidyPlaceName } from "./place";
import { fetchRetry } from "./static-files";

export function placeName(geoid: string): string | null {
  const names = NAMES as Record<string, string>;
  if (geoid.length === 11) {
    const county = names[geoid.slice(0, 5)];
    const tract = (Number(geoid.slice(5)) / 100).toString();
    return county ? `Census tract ${tract}, ${county}` : `Census tract ${tract}`;
  }
  return names[geoid] ? tidyPlaceName(names[geoid]) : null;
}

/**
 * The name of a place that exists, or null when it doesn't (made-up tract, retired county, wrong
 * length). States and counties are checked against the bundled names, tracts against their
 * county's geography file, so the page and share card never invent a name. Throws when the
 * tract file can't be reached; callers then fail open rather than 404 a real place.
 */
export async function placeNameChecked(geoid: string): Promise<string | null> {
  if (!/^\d+$/.test(geoid)) return null;
  if (geoid.length === 2 || geoid.length === 5) return placeName(geoid);
  if (geoid.length !== 11) return null;
  const r = await fetchRetry(tractGeoUrl(geoid), { next: { revalidate: 86400 } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`tract geography ${r.status}`);
  return geographyFromTractShard((await r.json()) as TractGeoShard, geoid)?.name ?? null;
}
