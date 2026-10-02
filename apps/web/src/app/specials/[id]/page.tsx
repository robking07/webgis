import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CANDIDATES } from "@/lib/insights";
import { approvedInsights } from "@/lib/approvals";
import { InsightDetail } from "@/components/InsightDetail";
import { SiteHeader } from "@/components/SiteHeader";

// Every candidate is a possible page; unapproved ones 404 until approved (D-116).
export function generateStaticParams() {
  return CANDIDATES.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: PageProps<"/specials/[id]">): Promise<Metadata> {
  const { id } = await params;
  const i = (await approvedInsights()).find((p) => p.id === id);
  return { title: i?.headline ? `${i.headline} · Odd Pairings · Mapwich` : "Odd Pairings · Mapwich" };
}

export default async function InsightPage({ params }: PageProps<"/specials/[id]">) {
  const { id } = await params;
  const insight = (await approvedInsights()).find((p) => p.id === id);
  if (!insight) notFound();
  return (
    <>
      <SiteHeader current="specials" />
      <InsightDetail insight={insight} />
    </>
  );
}
