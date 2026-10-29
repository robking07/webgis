// Find an address (issue #363): a pass-through to the Census Bureau's public geocoder, which sends
// no CORS headers for browsers. POST keeps the address out of request-log URLs; nothing here logs or
// stores it. Only the match's address and point go back.
import { cleanAddress, firstMatch } from "@/lib/geocode";

const CENSUS = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const noStore = { "cache-control": "no-store" };

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const q = cleanAddress((body as { q?: unknown } | null)?.q);
  if (!q) return Response.json({ error: "bad address" }, { status: 400, headers: noStore });
  const url = `${CENSUS}?${new URLSearchParams({ address: q, benchmark: "Public_AR_Current", format: "json" })}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!r.ok) return Response.json({ error: "lookup failed" }, { status: 502, headers: noStore });
    return Response.json({ match: firstMatch(await r.json()) }, { headers: noStore });
  } catch {
    return Response.json({ error: "lookup failed" }, { status: 504, headers: noStore });
  }
}
