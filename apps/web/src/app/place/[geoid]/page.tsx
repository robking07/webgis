import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceProfile } from "@/components/PlaceProfile";
import { levelOfGeoid } from "@/lib/place";

export const metadata: Metadata = { title: "Place profile · Mapwich" };

export default async function PlacePage({ params }: PageProps<"/place/[geoid]">) {
  const { geoid } = await params;
  if (!/^\d+$/.test(geoid) || !levelOfGeoid(geoid)) notFound();
  return <PlaceProfile geoid={geoid} />;
}
