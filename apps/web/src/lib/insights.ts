import data from "@/generated/insights.json";

export interface Insight {
  id: string; x: string; y: string; level: string; n: number; r: number; rho: number; withinState: number;
  /** "published" = passed the automatic checks; it still needs a reviewer's approval (D-116). */
  status: "published" | "flagged"; flags: string[];
  headline: string | null; caption: string | null; captionBy: string | null;
  /** Hash of the card's numbers and wording; an approval holds only while it matches. */
  fingerprint: string;
}
export const INSIGHTS = (data as unknown as { insights: Insight[] }).insights;
export const RULES = (data as unknown as { rules: Record<string, number> }).rules;
/** Pairs that passed the automatic checks: the review queue. */
export const CANDIDATES = INSIGHTS.filter((i) => i.status === "published");
export const FLAGGED = INSIGHTS.filter((i) => i.status === "flagged");
