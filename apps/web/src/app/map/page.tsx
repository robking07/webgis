import type { Metadata } from "next";
import { ViewerShell } from "@/components/ViewerShell";
import { DATASET_BY_ID } from "@/lib/registry";
import { shareMeta } from "@/lib/share-meta";

// A map link with a dataset in it (?d=<id>) previews as that dataset. Only the share tags change,
// never the tab title. The map's place and zoom (?at=) are in the query too, but the preview card
// is the dataset's, not a rendering of that view.
export async function generateMetadata({ searchParams }: PageProps<"/map">): Promise<Metadata> {
  const { d } = await searchParams;
  const ds = typeof d === "string" ? DATASET_BY_ID.get(d) : undefined;
  if (!ds) return {};
  return shareMeta({ title: `${ds.title} · Mapwich`, description: ds.description, image: `/og/data/${ds.id}` });
}

export default async function Page({ searchParams }: PageProps<"/map">) {
  const sp = await searchParams;
  const search = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  ).toString();
  return <ViewerShell search={search} />;
}
