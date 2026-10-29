"use client";
// A focused MPO's own total for the map(s) on screen (#292): its counties' counts added up, with
// margins combined the Census Bureau's way (lib/counts sumCounts, shareOf). Only maps whose counts the
// ingest publishes (relations.json) get a number; medians, indexes and modelled rates say they can't
// be added up. Exact when the MPO is whole counties; "approximate" when its boundary cuts one.
import { useEffect, useState } from "react";
import { formatEstimate } from "@webgis/design";
import { countsLabels, placeCounts, regionCounties, shareOf, sumCounts, type Counts } from "@/lib/counts";
import { loadMpoCounties, loadPlaceIndex, placeByGeoid } from "@/lib/search";
import type { Dataset } from "@/lib/registry";

// Shares are rounded down in the file, so floor again: a county 99.9% inside never reads "100%".
const pct = (s: number) => (s < 0.01 ? "under 1%" : `${Math.floor(s * 100)}%`);
// Every digit, for a staff report (formatValue would shorten a full count to "3.2M").
const full = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const count = (n: number, moe: number | null) => (moe ? formatEstimate(n, moe, "count") : { value: full.format(n), moe: null });
const est = (n: number, moe: number | null) => {
  const e = count(n, moe);
  return e.moe ? `${e.value} ±${e.moe}` : e.value;
};

// Viewer keys it by MPO, so a new pick starts empty.
export function RegionTotal({ datasets, mpo }: { datasets: Dataset[]; mpo: string }) {
  const [list, setList] = useState<Array<[string, number]> | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [totals, setTotals] = useState<Record<string, Counts | null>>({});
  useEffect(() => {
    let live = true;
    Promise.all([loadMpoCounties(), loadPlaceIndex()]).then(([all, rows]) => {
      if (!live) return;
      const l = all[mpo];
      if (!l) return; // an MPO newer than counties.json: no panel, as when the file fails
      setList(l);
      setNames(Object.fromEntries(l.map(([g]) => [g, placeByGeoid(rows, g)?.name ?? g])));
    }).catch(() => {}); // shortcut: a failed file shows no total, silently; say so if visitors hit it.
    return () => { live = false; };
  }, [mpo]);
  const ids = datasets.filter((d) => countsLabels(d.id)).map((d) => d.id).join(" ");
  useEffect(() => {
    if (!list) return;
    let live = true;
    const { counted } = regionCounties(list);
    for (const id of ids ? ids.split(" ") : []) {
      Promise.all(counted.map((g) => placeCounts(id, g))).then((rows) => live && setTotals((t) => ({ ...t, [id]: sumCounts(rows) })));
    }
    return () => { live = false; };
  }, [list, ids]);
  if (!list) return null;

  const { counted, cut } = regionCounties(list);
  // "Anoka County, MN" → "Anoka County" when every county is in one state.
  const one = new Set(list.map(([g]) => g.slice(0, 2))).size === 1;
  const name = (g: string) => (one ? names[g]?.replace(/, [A-Z]{2}$/, "") : names[g]);
  const named = (gs: string[]) => gs.map(name).join(", ");
  const cutIn = cut.filter(([, s]) => s >= 0.5), cutOut = cut.filter(([, s]) => s < 0.5);
  const cutText = (l: Array<[string, number]>) => l.map(([g, s]) => `${name(g)} (${pct(s)} of residents inside)`).join(", ");
  // The one visible status line: "Sherburne and Wright", or "3 counties" when the list would run long.
  const few = (l: Array<[string, number]>) => {
    const n = l.map(([g]) => name(g)?.replace(/ County(?=,|$)/, ""));
    return n.length > 2 ? `${n.length} counties` : n.join(" and ");
  };
  const counties = (n: number) => `${n} ${n === 1 ? "county" : "counties"}`;
  const status = cut.length
    ? `Approximate · ${counties(counted.length)}${cutIn.length ? `; ${few(cutIn)} only partly inside` : ""}${cutOut.length ? `; leaves out parts of ${few(cutOut)}` : ""}`
    : `Exact · ${counted.length} whole ${counted.length === 1 ? "county" : "counties"}`;
  const anyCounts = datasets.some((d) => countsLabels(d.id));
  return (
    <div className="wg-panel pointer-events-auto mt-1 w-80 max-w-[calc(100vw-1.5rem)] space-y-2 rounded-xl px-3 py-2" data-region-total={cut.length ? "approximate" : "exact"}>
      {datasets.map((d) => {
        const labels = countsLabels(d.id);
        const head = <p className="text-xs text-muted-foreground">{d.title}, {d.vintage.replace(/ \(.*\)$/, "")}</p>;
        if (!labels) return <p key={d.id} className="text-xs text-muted-foreground">{d.title}: can’t be added up across counties, so no area total.</p>;
        if (!counted.length) return <div key={d.id}>{head}<p className="text-sm text-muted-foreground">No county-based total: less than half of each county’s residents live inside this area.</p></div>;
        if (!(d.id in totals)) return <div key={d.id}>{head}<p className="text-sm text-muted-foreground">Adding up…</p></div>;
        const c = totals[d.id];
        if (!c || c[0] == null) return <div key={d.id}>{head}<p className="text-sm text-muted-foreground">No total: a county’s numbers are missing.</p></div>;
        // Percent maps are a count over a count, so the area's own rate is the proportion of the sums.
        // shortcut: ratio maps that aren't percents (mean commute minutes, deaths per 100,000) show their sums only; add the ratio formula if planners ask.
        const s = labels.per && d.unit === "percent" ? shareOf(c[0], c[1], c[2], c[3]) : null;
        const big = s ? formatEstimate(s.share, s.moe, "percent") : count(c[0], c[1]);
        return (
          <div key={d.id} data-region-dataset={d.id}>
            {head}
            <p className="text-xl font-semibold tabular-nums">
              {big.value}
              {big.moe && <span className="ml-1 text-xs font-normal text-muted-foreground">±{big.moe}</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="tabular-nums text-foreground">{est(c[0], c[1])}</span> {labels.of}
              {labels.per && c[2] != null && <> out of <span className="tabular-nums">{est(c[2], c[3])}</span> {labels.per}</>}
              {c[1] == null && " (a full count, no margin of error)"}
            </p>
          </div>
        );
      })}
      {anyCounts && counted.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <p data-region-status="">{status}</p>
          <details data-region-method="">
            <summary className="cursor-pointer rounded text-primary focus-visible:outline-2 focus-visible:outline-ring">How this is counted</summary>
            <p className="mt-1">
              The sum of {counties(counted.length)}: {named(counted)}.
              {cutIn.length > 0 && ` Counted in full though partly outside: ${cutText(cutIn)}.`}
              {cutOut.length > 0 && ` Left out though partly inside: ${cutText(cutOut)}.`}
              {cut.length > 0 && " A county counts when at least half its residents (2020 Census) live inside."}
              {" "}Margins of error are at 90% confidence, combined as the Census Bureau does.
            </p>
          </details>
        </div>
      )}
    </div>
  );
}
