import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceProfile } from "@/components/PlaceProfile";
import { SiteHeader } from "@/components/SiteHeader";
import { levelOfGeoid } from "@/lib/place";
// Bundled with the function (a serverless route can't count on reading public/ at runtime).
import NAMES from "../../../../public/data/geo/names.json";

/** The place's name for the tab title, from the static names export (states and counties; tracts via their county). */
function placeName(geoid: string): string | null {
  const names = NAMES as Record<string, string>;
  if (geoid.length === 11) {
    const county = names[geoid.slice(0, 5)];
    const tract = (Number(geoid.slice(5)) / 100).toString();
    return county ? `Census tract ${tract}, ${county}` : `Census tract ${tract}`;
  }
  return names[geoid] ?? null;
}

export async function generateMetadata({ params }: PageProps<"/place/[geoid]">): Promise<Metadata> {
  const { geoid } = await params;
  const name = placeName(geoid);
  return { title: name ? `${name} · Mapwich` : "Place profile · Mapwich" };
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
