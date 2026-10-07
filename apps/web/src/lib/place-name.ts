// A place's name from the static names export (states and counties; tracts via their county).
// Bundled with the function (a serverless route can't count on reading files at runtime); the
// ingest's `export` step writes it to src/generated beside registry.json (S2).
import NAMES from "@/generated/names.json";

export function placeName(geoid: string): string | null {
  const names = NAMES as Record<string, string>;
  if (geoid.length === 11) {
    const county = names[geoid.slice(0, 5)];
    const tract = (Number(geoid.slice(5)) / 100).toString();
    return county ? `Census tract ${tract}, ${county}` : `Census tract ${tract}`;
  }
  return names[geoid] ?? null;
}
