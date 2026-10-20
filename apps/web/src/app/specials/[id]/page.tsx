import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CANDIDATES } from "@/lib/insights";
import { approvedInsights } from "@/lib/approvals";
import { SPECIALS } from "@/lib/specials";
import { InsightDetail } from "@/components/InsightDetail";
import { SiteHeader } from "@/components/SiteHeader";
import { shareMeta } from "@/lib/share-meta";
import { SpecialPiece } from "@/components/specials/SpecialPiece";

// /specials/<id> is a piece (content/specials/<id>.md) or a Combination (its pair id). The loader
// fails the build if a piece's name matches a pairing, so the two never collide (D-115).
// Every candidate pairing gets a page; unapproved ones 404 until approved (D-116).
export function generateStaticParams() {
  return [...SPECIALS.map((s) => ({ id: s.slug })), ...CANDIDATES.map((i) => ({ id: i.id }))];
}
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/specials/[id]">): Promise<Metadata> {
  const { id } = await params;
  const s = SPECIALS.find((p) => p.slug === id);
  if (s) return { title: `${s.title} · Specials · Mapwich`, description: s.dek, ...shareMeta({ title: s.title, description: s.dek, path: `/specials/${s.slug}`, image: s.image ?? `/og/special/${s.slug}` }) };
  const i = (await approvedInsights()).find((p) => p.id === id);
  if (!i) return { title: "Combinations · Mapwich" };
  const title = i.headline ?? "Combinations";
  return { title: i.headline ? `${i.headline} · Combinations · Mapwich` : "Combinations · Mapwich", ...shareMeta({ title, description: i.caption ?? "Two things on the map that move together.", path: `/specials/${i.id}`, image: `/og/special/${i.id}` }) };
}

export default async function SpecialOrPairingPage({ params }: PageProps<"/specials/[id]">) {
  const { id } = await params;
  const special = SPECIALS.find((p) => p.slug === id);
  if (special) return (<><SiteHeader current="specials" /><SpecialPiece special={special} /></>);
  const insight = (await approvedInsights()).find((p) => p.id === id);
  if (!insight) notFound();
  return (
    <>
      <SiteHeader current="specials" />
      <InsightDetail insight={insight} />
    </>
  );
}
