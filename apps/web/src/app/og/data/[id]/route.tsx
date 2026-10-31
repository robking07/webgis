import { ALL_DATASETS, DATASET_BY_ID } from "@/lib/registry";
import { ogCard } from "@/lib/og-card";

export const dynamicParams = false;
export const generateStaticParams = () => ALL_DATASETS.map((d) => ({ id: d.id }));

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const d = DATASET_BY_ID.get((await params).id);
  if (!d) return new Response("Not found", { status: 404 });
  return ogCard({ kicker: d.category, title: d.title, summary: d.description });
}
