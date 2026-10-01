import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PUBLISHED } from "@/lib/insights";
import { InsightDetail } from "@/components/InsightDetail";
import { SiteHeader } from "@/components/SiteHeader";

export function generateStaticParams() {
  return PUBLISHED.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: PageProps<"/specials/[id]">): Promise<Metadata> {
  const { id } = await params;
  const i = PUBLISHED.find((p) => p.id === id);
  return { title: i?.headline ? `${i.headline} · Odd Pairings · Mapwich` : "Odd Pairings · Mapwich" };
}

export default async function InsightPage({ params }: PageProps<"/specials/[id]">) {
  const { id } = await params;
  const insight = PUBLISHED.find((p) => p.id === id);
  if (!insight) notFound();
  return (
    <>
      <SiteHeader current="specials" />
      <InsightDetail insight={insight} />
    </>
  );
}
