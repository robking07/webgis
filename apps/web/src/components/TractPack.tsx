"use client";
// A county's region data pack (#370, D-504): every map for its tracts in one .xlsx, built in the
// browser from the tract files the details panel already reads, plus how to join it in GIS.
import { useState } from "react";
import { loadTractGeoShard, loadTractShard } from "@/lib/details";
import { PACK_2010_NOTE, saveBlob, tractPack } from "@/lib/csv";
import { DATASETS } from "@/lib/registry";

const link = "rounded text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring";

export function TractPack({ county, name }: { county: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    setBusy(true); setError(false);
    try {
      const [values, geo] = await Promise.all([loadTractShard(county), loadTractGeoShard(county)]);
      if (!values) throw new Error("no tract file");
      saveBlob(tractPack(county, name, values, geo ?? {}, DATASETS), `mapwich-tracts-${county}.xlsx`);
    } catch { setError(true); } finally { setBusy(false); }
  }

  return (
    <section id="tract-data" aria-labelledby="tract-data-h" className="mt-8 border-t pt-6 text-sm print:hidden" data-tract-pack="">
      <h2 id="tract-data-h" className="mb-2 text-base font-semibold">Every map, by census tract</h2>
      <button type="button" onClick={download} disabled={busy} aria-busy={busy}
        className="inline-flex min-h-11 items-center rounded-md border px-3 hover:bg-muted disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {busy ? "Preparing…" : "Download tract data (Excel)"}
      </button>
      <p className="mt-2 text-xs text-muted-foreground" role="status">
        {error ? "Couldn’t prepare the tract file. Try again." : "One row per tract, with a value and a margin of error column for each map. The “about” sheet gives each column’s title, unit, period and source."}
      </p>
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className={`cursor-pointer ${link}`}>Join it to tract boundaries in QGIS or ArcGIS</summary>
        <p className="mt-1">
          GEOID is the 11-digit 2020 census tract ID, kept as text so its leading zero survives. Get tract boundaries for the state from the
          Census Bureau (<a className={link} href="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html">cartographic boundary files</a>,
          {" "}e.g. cb_2024_{county.slice(0, 2)}_tract_500k, or TIGER/Line tracts, 2020 or later).
        </p>
        <p className="mt-1">QGIS: add the file’s “data” sheet as a layer, then in the tract layer’s Properties › Joins, join GEOID to GEOID.</p>
        <p className="mt-1">ArcGIS Pro: add the “data” sheet, right-click the tract layer › Joins and Relates › Add Join, with GEOID as both fields.</p>
        <p className="mt-1">Save the result as a GeoPackage or geodatabase; a shapefile cuts field names to 10 characters.</p>
        <p className="mt-1">{PACK_2010_NOTE}</p>
      </details>
    </section>
  );
}
