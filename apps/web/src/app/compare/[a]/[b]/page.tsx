// Compare places side by side (roadmap 1.1, issue #117): /compare/<A>/<B>?d=<dataset id>.
// Laptops and monitors show a map beside the panel with both places outlined (PR 2a); phones get no map.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparePlaces } from "@/components/compare/ComparePlaces";
import { SiteHeader } from "@/components/SiteHeader";
import { parseCompare } from "@/lib/compare";
import { placeName } from "@/lib/place-name";
import { DATASET_BY_ID } from "@/lib/registry";
import { LANDING } from "@/lib/landing";
import { shareMeta } from "@/lib/share-meta";

type Props = PageProps<"/compare/[a]/[b]">;

async function load({ params, searchParams }: Props) {
  const [{ a, b }, sp] = await Promise.all([params, searchParams]);
  const state = parseCompare(a, b, typeof sp.d === "string" ? new URLSearchParams({ d: sp.d }) : "");
  if (!state) return null;
  const nameA = placeName(state.a), nameB = placeName(state.b);
  if (!nameA || !nameB) return null;
  // No metric named (or an unknown one): lead with the landing map's.
  const dataset = DATASET_BY_ID.get(state.d ?? "") ?? DATASET_BY_ID.get(LANDING.d)!;
  return { ...state, nameA, nameB, dataset };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const c = await load(props);
  if (!c) return { title: "Compare places · Mapwich" };
  const title = `${c.nameA} vs ${c.nameB} · Mapwich`;
  return {
    title,
    ...shareMeta({ title, description: `${c.dataset.title} and related figures for both places, side by side.`, path: `/compare/${c.a}/${c.b}?d=${c.dataset.id}` }),
  };
}

export default async function ComparePage(props: Props) {
  const c = await load(props);
  if (!c) notFound();
  return (
    <>
      <SiteHeader />
      <ComparePlaces a={c.a} b={c.b} nameA={c.nameA} nameB={c.nameB} datasetId={c.dataset.id} />
    </>
  );
}
