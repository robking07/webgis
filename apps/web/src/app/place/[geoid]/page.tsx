import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceProfile } from "@/components/PlaceProfile";
import { SimilarPlaces } from "@/components/SimilarPlaces";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteNav";
import { placeNameChecked } from "@/lib/place-name";
import { shareMeta } from "@/lib/share-meta";

// null = no such place; undefined = couldn't check (data host down), so the page still opens.
const lookup = (geoid: string) => placeNameChecked(geoid).catch(() => undefined);

export async function generateMetadata({ params }: PageProps<"/place/[geoid]">): Promise<Metadata> {
  const { geoid } = await params;
  const name = await lookup(geoid);
  if (!name) return { title: "Place profile · Mapwich" };
  return { title: `${name} · Mapwich`, ...shareMeta({ title: `${name} · Mapwich`, description: "Census and transportation data for this place, on the map.", path: `/place/${geoid}`, image: `/og/place/${geoid}` }) };
}

export default async function PlacePage({ params }: PageProps<"/place/[geoid]">) {
  const { geoid } = await params;
  const name = await lookup(geoid);
  if (name === null) notFound();
  return (
    <>
      <SiteHeader />
      <PlaceProfile geoid={geoid} name={name} similar={<SimilarPlaces geoid={geoid} />} />
      <div className="mx-auto max-w-3xl px-4 pb-8 md:px-8"><SiteFooter /></div>
    </>
  );
}
