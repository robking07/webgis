import data from "@/generated/insights.json";

export interface Insight {
  id: string; x: string; y: string; level: string; n: number; r: number; rho: number; withinState: number;
  status: "published" | "flagged"; flags: string[];
  headline: string | null; caption: string | null; captionBy: string | null;
}
export const INSIGHTS = (data as unknown as { insights: Insight[] }).insights;
export const RULES = (data as unknown as { rules: Record<string, number> }).rules;
export const PUBLISHED = INSIGHTS.filter((i) => i.status === "published");
export const FLAGGED = INSIGHTS.filter((i) => i.status === "flagged");
export const INSIGHT_BY_ID = new Map(INSIGHTS.map((i) => [i.id, i]));

// Plain-language reading of a pair for the Specials pages (D-115). Same thresholds as the caption
// template in data/ingest/src/insights.ts, so the icon and the caption always agree.
export type Strength = 1 | 2 | 3;
export const strengthOf = (rho: number): Strength => { const a = Math.abs(+rho.toFixed(2)); return a >= 0.6 ? 3 : a >= 0.4 ? 2 : 1; };
export const STRENGTH_WORD: Record<Strength, string> = { 3: "Strong", 2: "Moderate", 1: "Modest" };
/** Much of the pattern is between regions: within states the link is much weaker. */
export const isRegional = (i: Insight) => Math.abs(i.withinState) < Math.abs(i.rho) * 0.6;
export const rhoText = (v: number) => v.toFixed(2).replace("-", "−");
/** The full reading, for the icon's tooltip and screen readers. */
export const strengthLabel = (i: Insight) =>
  `${STRENGTH_WORD[strengthOf(i.rho)]} link (Spearman ρ = ${rhoText(i.rho)})${isRegional(i) ? "; mostly a regional pattern" : ""}`;
