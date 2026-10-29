// Find an address (issue #363, D-487): the Census Bureau's public geocoder, through our own
// /api/geocode pass-through (no key, nothing logged or kept). Shared by the route and the search box.

/** "411 W 1st St, Duluth": a house number, then a word. A bare ZIP or "3M" isn't one. */
export const looksLikeAddress = (q: string) => /^\d+[a-z]?(-\d+)?\s+\p{L}/iu.test(q.trim());

/** The address as sent on, or null when it isn't a plausible one-line address (the trust boundary). */
export function cleanAddress(q: unknown): string | null {
  if (typeof q !== "string") return null;
  const s = q.trim().replace(/\s+/g, " ");
  return s.length >= 5 && s.length <= 200 && /^[\p{L}\p{N} .,'#&/-]+$/u.test(s) ? s : null;
}

export interface AddressMatch { address: string; lon: number; lat: number }

/** The first match from the Census geocoder's `locations/onelineaddress` JSON, or null. */
export function firstMatch(json: unknown): AddressMatch | null {
  const m = (json as { result?: { addressMatches?: Array<{ matchedAddress?: unknown; coordinates?: { x?: unknown; y?: unknown } }> } })?.result?.addressMatches?.[0];
  const lon = m?.coordinates?.x, lat = m?.coordinates?.y;
  return m && typeof m.matchedAddress === "string" && typeof lon === "number" && typeof lat === "number" ? { address: m.matchedAddress, lon, lat } : null;
}

/** Look an address up (client side). POST, so the address isn't in a URL that request logs keep. */
export async function findAddress(q: string): Promise<AddressMatch | null> {
  const r = await fetch("/api/geocode", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q }) });
  if (!r.ok) throw new Error(`geocode ${r.status}`);
  return ((await r.json()) as { match: AddressMatch | null }).match;
}
