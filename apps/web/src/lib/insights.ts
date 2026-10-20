import data from "@/generated/insights.json";
import { DATASET_BY_ID } from "./registry";

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

const catOf = (id: string) => DATASET_BY_ID.get(id)?.category ?? "";
const titleOf = (id: string) => DATASET_BY_ID.get(id)?.title ?? id;
export const pairTitle = (i: Insight) => `${titleOf(i.x)} × ${titleOf(i.y)}`;

/** The front page's pick (issue #274): moderate or strong pairs that hold within states, ranked by
 *  within-state strength; no dataset twice, and pairs from topics not yet shown go first. */
export function pickInteresting(pairs: Insight[], n = 6): Insight[] {
  const pool = pairs.filter((i) => strengthOf(i.rho) >= 2 && !isRegional(i))
    .sort((a, b) => Math.abs(b.withinState) - Math.abs(a.withinState) || a.id.localeCompare(b.id));
  const out: Insight[] = [], used = new Set<string>(), cats = new Set<string>();
  for (const fresh of [true, false]) {
    for (const i of pool) {
      if (out.length >= n) return out;
      if (used.has(i.x) || used.has(i.y) || (fresh && (cats.has(catOf(i.x)) || cats.has(catOf(i.y))))) continue;
      out.push(i);
      used.add(i.x).add(i.y);
      cats.add(catOf(i.x)).add(catOf(i.y));
    }
  }
  return out;
}

export type PairSort = "strongest" | "within" | "az";
export interface PairQuery { topic?: string; strength?: Strength; q?: string; sort?: PairSort }
/** The /specials/pairings filters: topic = either dataset's category; every word of q in the pair's titles. */
export function browsePairings(pairs: Insight[], { topic, strength, q, sort = "strongest" }: PairQuery): Insight[] {
  const words = (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const hit = pairs.filter((i) =>
    (!topic || catOf(i.x) === topic || catOf(i.y) === topic) &&
    (!strength || strengthOf(i.rho) === strength) &&
    words.every((w) => pairTitle(i).toLowerCase().includes(w)));
  const by = {
    strongest: (a: Insight, b: Insight) => Math.abs(b.rho) - Math.abs(a.rho),
    within: (a: Insight, b: Insight) => Math.abs(b.withinState) - Math.abs(a.withinState),
    az: (a: Insight, b: Insight) => pairTitle(a).localeCompare(pairTitle(b)),
  }[sort];
  return hit.sort((a, b) => by(a, b) || a.id.localeCompare(b.id));
}
