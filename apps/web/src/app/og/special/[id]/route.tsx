import { CANDIDATES } from "@/lib/insights";
import { approvedInsights } from "@/lib/approvals";
import { SPECIALS } from "@/lib/specials";
import { ogCard } from "@/lib/og-card";

// Generated card for Specials without their own thumbnail, and for Combinations.
export const dynamicParams = false;
export const generateStaticParams = () => [...SPECIALS.map((s) => ({ id: s.slug })), ...CANDIDATES.map((i) => ({ id: i.id }))];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = SPECIALS.find((p) => p.slug === id);
  if (s) return ogCard({ kicker: "Specials", title: s.title, summary: s.dek });
  const i = (await approvedInsights()).find((p) => p.id === id);
  if (!i) return new Response("Not found", { status: 404 });
  return ogCard({ kicker: "Combinations", title: i.headline ?? "Combinations", summary: i.caption ?? "Two things on the map that move together." });
}
