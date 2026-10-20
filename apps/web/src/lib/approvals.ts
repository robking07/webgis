// Which Combinations a reviewer approved (D-116). Server-only: read through the public
// approvals grant (pair id + fingerprint, never notes), cached and tagged so the review
// page can refresh /specials right after a verdict. Pages stay cached between refreshes,
// so viewing doesn't depend on the database being awake (D-02).
import { CANDIDATES, type Insight } from "./insights";

export const APPROVALS_TAG = "approvals";

async function approvedIds(): Promise<Set<string>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return new Set();
  try {
    const res = await fetch(`${url}/rest/v1/insight_reviews?select=insight_id,fingerprint&verdict=eq.approved`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600, tags: [APPROVALS_TAG] },
    });
    if (!res.ok) throw new Error(`approvals → ${res.status}`);
    const rows = (await res.json()) as Array<{ insight_id: string; fingerprint: string }>;
    const current = new Map(CANDIDATES.map((i) => [i.id, i.fingerprint]));
    return new Set(rows.filter((r) => current.get(r.insight_id) === r.fingerprint).map((r) => r.insight_id));
  } catch (e) {
    // At build time, show nothing rather than fail the deploy. At runtime, rethrow so
    // Next keeps serving the last good page.
    if (process.env.NEXT_PHASE === "phase-production-build") return new Set();
    throw e;
  }
}

/** Cards that passed the checks and were approved as they stand now. */
export async function approvedInsights(): Promise<Insight[]> {
  const ids = await approvedIds();
  return CANDIDATES.filter((i) => ids.has(i.id));
}
