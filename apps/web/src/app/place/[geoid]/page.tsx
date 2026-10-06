import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceProfile } from "@/components/PlaceProfile";
import { SiteHeader } from "@/components/SiteHeader";
import { levelOfGeoid } from "@/lib/place";
import { placeName } from "@/lib/place-name";
import { shareMeta } from "@/lib/share-meta";

export async function generateMetadata({ params }: PageProps<"/place/[geoid]">): Promise<Metadata> {
  const { geoid } = await params;
  const name = placeName(geoid);
  if (!name) return { title: "Place profile · Mapwich" };
  return { title: `${name} · Mapwich`, ...shareMeta({ title: `${name} · Mapwich`, description: "Census and transportation data for this place, on the map.", path: `/place/${geoid}`, image: `/og/place/${geoid}` }) };
}

export default async function PlacePage({ params }: PageProps<"/place/[geoid]">) {
  const { geoid } = await params;
  if (!/^\d+$/.test(geoid) || !levelOfGeoid(geoid)) notFound();
  return (
    <>
      <SiteHeader />
      <PlaceProfile geoid={geoid} />
    </>
  );
}
