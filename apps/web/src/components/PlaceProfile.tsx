"use client";
// Every dataset for one place. Values, margins of error and geography come from static files (lib/details.ts).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StatusState } from "@webgis/design/components";
import { PlaceDataList, type Detail } from "./PlaceDataList";
import { KeyNumbers } from "./KeyNumbers";
import { Picker } from "./compare/CompareWith";
import { fetchDetail, fetchGeography, type Geography } from "@/lib/details";
import { levelOfGeoid, PLACE_ZOOM } from "@/lib/place";
import { serializeUrlState } from "@/lib/url-state";
import { LANDING } from "@/lib/landing";
import { placeCsv, saveBlob } from "@/lib/csv";
import { DATASETS } from "@/lib/registry";

const link = "rounded text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring";

/** `similar`: the server-rendered similar-counties list (counties only), shown under the key numbers. */
export function PlaceProfile({ geoid, similar }: { geoid: string; similar?: ReactNode }) {
  const level = levelOfGeoid(geoid)!;
  const [geo, setGeo] = useState<Geography | null | undefined>(undefined);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [err, setErr] = useState(false);
  const [comparing, setComparing] = useState(false);
  const compareBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    Promise.all([fetchGeography(geoid), fetchDetail(geoid)]).then(([g, d]) => { setGeo(g); setDetail(d); }, () => setErr(true));
  }, [geoid]);

  // shortcut: opens on the place, not with it selected (the map takes no selection from the URL); add one if that is missed.
  const mapHref = (id: string) => geo ? `/map${serializeUrlState({ d: id, b: null, at: { lon: geo.lon, lat: geo.lat, zoom: PLACE_ZOOM[level] }, theme: null, lv: null })}` : "/map";

  if (err) return <main className="mx-auto max-w-3xl p-6"><StatusState status="error" message="This place couldn't be loaded." /></main>;
  if (geo === undefined || !detail) return <main className="mx-auto max-w-3xl p-6"><StatusState status="loading" message="Loading place…" /></main>;
  if (geo === null) return <main className="mx-auto max-w-3xl p-6"><StatusState status="empty" message="No place with that ID." /></main>;

  const rows = DATASETS.filter((d) => detail[d.id]).map((d) => ({ d, ...detail[d.id] }));
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <nav className="mb-4 text-sm print:hidden"><a href={mapHref(new URLSearchParams(window.location.search).get("d") ?? LANDING.d)} className="text-primary underline-offset-2 hover:underline">← Back to the map</a></nav>
      <header className="mb-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{level === "tract" ? "Census tract" : level === "county" ? "County" : "State"} profile</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{geo.name}</h1>
          {/* shortcut: tracts aren't in the search index, so tract pages get no picker (tracts compare by tapping on the map); add one if tracts join the index. */}
          {(level === "state" || level === "county") && !comparing && (
            <button ref={compareBtn} type="button" onClick={() => setComparing(true)}
              className="rounded-md border px-2.5 py-1 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring print:hidden">Compare with…</button>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {Object.keys(detail).length} datasets · {geo.aland_sqmi.toLocaleString(undefined, { maximumFractionDigits: 1 })} sq mi of land
        </p>
        <div className="mt-2 flex gap-4 text-sm print:hidden">
          <button type="button" onClick={() => window.print()} className={link}>Print / save as PDF</button>
          <button type="button" onClick={() => saveBlob(placeCsv(geoid, geo.name, rows), `mapwich-place-${geoid}.csv`)} className={link}>Download CSV</button>
        </div>
        {comparing && (
          <div className="mt-3 max-w-sm">
            <Picker a={geoid} level={level} name={geo.name} datasetId={null}
              onCancel={() => { setComparing(false); requestAnimationFrame(() => compareBtn.current?.focus()); }} />
          </div>
        )}
      </header>
      <KeyNumbers geoid={geoid} detail={detail} />
      {similar}
      <PlaceDataList geoid={geoid} level={level} detail={detail} mapHref={mapHref} />
    </main>
  );
}
