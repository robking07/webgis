"use client";
// Every dataset for one place. Values, margins of error and geography come from static files (lib/details.ts).
import { useEffect, useRef, useState } from "react";
import { StatusState } from "@webgis/design/components";
import { PlaceDataList, type Detail } from "./PlaceDataList";
import { Picker } from "./compare/CompareWith";
import { fetchDetail, fetchGeography, type Geography } from "@/lib/details";
import { levelOfGeoid, PLACE_ZOOM } from "@/lib/place";
import { serializeUrlState } from "@/lib/url-state";
import { LANDING } from "@/lib/landing";

export function PlaceProfile({ geoid }: { geoid: string }) {
  const level = levelOfGeoid(geoid)!;
  const [geo, setGeo] = useState<Geography | null | undefined>(undefined);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [err, setErr] = useState(false);
  const [comparing, setComparing] = useState(false);
  const compareBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    Promise.all([fetchGeography(geoid), fetchDetail(geoid)]).then(([g, d]) => { setGeo(g); setDetail(d); }, () => setErr(true));
  }, [geoid]);

  const mapHref = (id: string) => geo ? `/map${serializeUrlState({ d: id, b: null, at: { lon: geo.lon, lat: geo.lat, zoom: PLACE_ZOOM[level] }, theme: null, lv: null })}` : "/map";

  if (err) return <main className="mx-auto max-w-3xl p-6"><StatusState status="error" message="This place couldn't be loaded." /></main>;
  if (geo === undefined || !detail) return <main className="mx-auto max-w-3xl p-6"><StatusState status="loading" message="Loading place…" /></main>;
  if (geo === null) return <main className="mx-auto max-w-3xl p-6"><StatusState status="empty" message="No place with that ID." /></main>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <nav className="mb-4 text-sm"><a href={mapHref(LANDING.d)} className="text-primary underline-offset-2 hover:underline">← Back to the map</a></nav>
      <header className="mb-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{level === "tract" ? "Census tract" : level === "county" ? "County" : "State"} profile</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{geo.name}</h1>
          {/* shortcut: tracts aren't in the search index, so tract pages get no picker (tracts compare by tapping on the map); add one if tracts join the index. */}
          {(level === "state" || level === "county") && !comparing && (
            <button ref={compareBtn} type="button" onClick={() => setComparing(true)}
              className="rounded-md border px-2.5 py-1 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Compare with…</button>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {Object.keys(detail).length} datasets · {geo.aland_sqmi.toLocaleString(undefined, { maximumFractionDigits: 1 })} sq mi of land
        </p>
        {comparing && (
          <div className="mt-3 max-w-sm">
            <Picker a={geoid} level={level} name={geo.name} datasetId={null}
              onCancel={() => { setComparing(false); requestAnimationFrame(() => compareBtn.current?.focus()); }} />
          </div>
        )}
      </header>
      <PlaceDataList level={level} detail={detail} mapHref={mapHref} />
    </main>
  );
}
