"use client";
// Every dataset for one place. Values and MOEs come live from Supabase.
import { useEffect, useState } from "react";
import { StatusState } from "@webgis/design/components";
import { PlaceDataList, type Detail } from "./PlaceDataList";
import { fetchDetail, fetchGeography, type Geography } from "@/lib/supabase";
import { levelOfGeoid, PLACE_ZOOM } from "@/lib/place";
import { serializeUrlState } from "@/lib/url-state";
import { DATASETS } from "@/lib/registry";

export function PlaceProfile({ geoid }: { geoid: string }) {
  const level = levelOfGeoid(geoid)!;
  const [geo, setGeo] = useState<Geography | null | undefined>(undefined);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    Promise.all([fetchGeography(geoid), fetchDetail(geoid)]).then(([g, d]) => { setGeo(g); setDetail(d); }, () => setErr(true));
  }, [geoid]);

  const mapHref = (id: string) => geo ? `/${serializeUrlState({ d: id, b: null, at: { lon: geo.lon, lat: geo.lat, zoom: PLACE_ZOOM[level] }, theme: null })}` : "/";

  if (err) return <main className="mx-auto max-w-3xl p-6"><StatusState status="error" message="This place couldn't be loaded." /></main>;
  if (geo === undefined || !detail) return <main className="mx-auto max-w-3xl p-6"><StatusState status="loading" message="Loading place…" /></main>;
  if (geo === null) return <main className="mx-auto max-w-3xl p-6"><StatusState status="empty" message="No place with that ID." /></main>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <nav className="mb-4 text-sm"><a href={mapHref(DATASETS[0]?.id ?? "")} className="text-primary underline-offset-2 hover:underline">← Back to the map</a></nav>
      <header className="mb-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{level === "tract" ? "Census tract" : level === "county" ? "County" : "State"} profile</p>
        <h1 className="text-2xl font-semibold tracking-tight">{geo.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {Object.keys(detail).length} datasets · {geo.aland_sqmi.toLocaleString(undefined, { maximumFractionDigits: 1 })} sq mi of land
        </p>
      </header>
      <PlaceDataList level={level} detail={detail} mapHref={mapHref} />
    </main>
  );
}
