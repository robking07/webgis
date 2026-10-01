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
