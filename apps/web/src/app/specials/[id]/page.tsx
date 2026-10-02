import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PUBLISHED } from "@/lib/insights";
import { SPECIALS } from "@/lib/specials";
import { InsightDetail } from "@/components/InsightDetail";
import { SiteHeader } from "@/components/SiteHeader";
import { SpecialPiece } from "@/components/specials/SpecialPiece";

// /specials/<id> is a piece (content/specials/<id>.md) or an Odd Pairing (its pair id). The loader
// fails the build if a piece's name matches a pairing, so the two never collide (D-115).
export function generateStaticParams() {
  return [...SPECIALS.map((s) => ({ id: s.slug })), ...PUBLISHED.map((i) => ({ id: i.id }))];
}
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/specials/[id]">): Promise<Metadata> {
  const { id } = await params;
  const s = SPECIALS.find((p) => p.slug === id);
  if (s) return { title: `${s.title} · Specials · Mapwich`, description: s.dek };
  const i = PUBLISHED.find((p) => p.id === id);
  return { title: i?.headline ? `${i.headline} · Odd Pairings · Mapwich` : "Odd Pairings · Mapwich" };
}

export default async function SpecialOrPairingPage({ params }: PageProps<"/specials/[id]">) {
  const { id } = await params;
  const special = SPECIALS.find((p) => p.slug === id);
  if (special) return (<><SiteHeader current="specials" /><SpecialPiece special={special} /></>);
  const insight = PUBLISHED.find((p) => p.id === id);
  if (!insight) notFound();
  return (
    <>
      <SiteHeader current="specials" />
      <InsightDetail insight={insight} />
    </>
  );
}
