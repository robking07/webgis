// Compare places side by side (roadmap 1.1, issue #117): /compare/<A>/<B>?d=<dataset id>.
// Each place gets its own map (side by side on laptops, tabs on phones; D-258 PR 2a, 2c).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparePlaces } from "@/components/compare/ComparePlaces";
import { SiteHeader } from "@/components/SiteHeader";
import { parseCompare, shortName } from "@/lib/compare";
import { parentsOf } from "@/lib/counts";
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
  // Names of the places each one's share is taken of (county, state, U.S.), for the counts (2b).
  const parentNames = Object.fromEntries([...parentsOf(state.a), ...parentsOf(state.b)].map((g) => [g, g === "us" ? "U.S." : shortName(placeName(g) ?? g)]));
  // A named but unknown metric (#306): the page says it fell back and rewrites the URL.
  const unknownD = typeof sp.d === "string" && sp.d !== "" && !DATASET_BY_ID.has(sp.d);
  return { ...state, nameA, nameB, dataset, parentNames, unknownD };
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
      <ComparePlaces a={c.a} b={c.b} nameA={c.nameA} nameB={c.nameB} datasetId={c.dataset.id} parentNames={c.parentNames} unknownD={c.unknownD} />
    </>
  );
}
