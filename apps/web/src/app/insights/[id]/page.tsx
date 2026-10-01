import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PUBLISHED } from "@/lib/insights";
import { InsightDetail } from "@/components/InsightDetail";

export function generateStaticParams() {
  return PUBLISHED.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: PageProps<"/insights/[id]">): Promise<Metadata> {
  const { id } = await params;
  const i = PUBLISHED.find((p) => p.id === id);
  return { title: i?.headline ? `${i.headline} · Weird Insights` : "Weird Insights" };
}

export default async function InsightPage({ params }: PageProps<"/insights/[id]">) {
  const { id } = await params;
  const insight = PUBLISHED.find((p) => p.id === id);
  if (!insight) notFound();
  return <InsightDetail insight={insight} />;
}
