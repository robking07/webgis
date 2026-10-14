import { placeNameChecked } from "@/lib/place-name";
import { ogCard } from "@/lib/og-card";

export async function GET(_: Request, { params }: { params: Promise<{ geoid: string }> }) {
  const { geoid } = await params;
  const name = await placeNameChecked(geoid).catch(() => null);
  if (!name) return new Response("Not found", { status: 404 });
  return ogCard({ kicker: "Place profile", title: name, summary: "Census and transportation data for this place, on the map." });
}
