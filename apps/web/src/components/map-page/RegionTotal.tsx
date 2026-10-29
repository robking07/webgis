"use client";
// A focused MPO's own total for the map(s) on screen (#292): its counties' counts added up, with
// margins combined the Census Bureau's way (lib/counts sumCounts, shareOf). Only maps whose counts the
// ingest publishes (relations.json) get a number; medians, indexes and modelled rates say they can't
// be added up. Exact when the MPO is whole counties; "approximate" when its boundary cuts one.
import { useEffect, useState } from "react";
import { formatEstimate, formatValue } from "@webgis/design";
import { countsLabels, placeCounts, regionCounties, shareOf, sumCounts, type Counts } from "@/lib/counts";
import { loadMpoCounties, loadPlaceIndex, placeByGeoid } from "@/lib/search";
import type { Dataset } from "@/lib/registry";

// Shares are rounded down in the file, so floor again: a county 99.9% inside never reads "100%".
const pct = (s: number) => (s < 0.01 ? "under 1%" : `${Math.floor(s * 100)}%`);
const est = (n: number, moe: number | null) => {
  const e = formatEstimate(n, moe, "count");
  return e.moe ? `${e.value} ±${e.moe}` : e.value;
};

export function RegionTotal({ datasets, mpo }: { datasets: Dataset[]; mpo: string }) {
  const [list, setList] = useState<Array<[string, number]> | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [totals, setTotals] = useState<Record<string, Counts | null>>({});
  useEffect(() => {
    let live = true;
    setList(null); setTotals({});
    Promise.all([loadMpoCounties(), loadPlaceIndex()]).then(([all, rows]) => {
      if (!live) return;
      const l = all[mpo] ?? [];
      setList(l);
      setNames(Object.fromEntries(l.map(([g]) => [g, placeByGeoid(rows, g)?.name ?? g])));
    }).catch(() => live && setList([]));
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
  const named = (gs: string[]) => gs.map((g) => names[g]).join(", ");
  return (
    <div className="wg-panel pointer-events-auto mt-1 w-80 max-w-[calc(100vw-1.5rem)] space-y-2 rounded-xl px-3 py-2" data-region-total={cut.length ? "approximate" : "exact"}>
      {datasets.map((d) => {
        const labels = countsLabels(d.id);
        const head = <p className="text-xs text-muted-foreground">{d.title}, {d.vintage.replace(/ \(.*\)$/, "")}</p>;
        if (!labels) return <div key={d.id}>{head}<p className="text-sm text-muted-foreground">Can’t be added up across counties, so this area has no total.</p></div>;
        if (!counted.length) return <div key={d.id}>{head}<p className="text-sm text-muted-foreground">No total: this area holds less than half of every county it touches.</p></div>;
        if (!(d.id in totals)) return <div key={d.id}>{head}<p className="text-sm text-muted-foreground">Adding up…</p></div>;
        const c = totals[d.id];
        if (!c || c[0] == null) return <div key={d.id}>{head}<p className="text-sm text-muted-foreground">No total: a county’s numbers are missing.</p></div>;
        // Percent maps are a count over a count, so the area's own rate is the proportion of the sums.
        // shortcut: ratio maps that aren't percents (mean commute minutes, deaths per 100,000) show their sums only; add the ratio formula if planners ask.
        const s = labels.per && d.unit === "percent" ? shareOf(c[0], c[1], c[2], c[3]) : null;
        const big = s ? { value: formatValue(s.share, "percent"), moe: s.moe != null ? formatValue(s.moe, "percent") : null } : formatEstimate(c[0], c[1], "count");
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
      {counted.length > 0 && (
        <p className="text-xs text-muted-foreground" data-region-method="">
          {cut.length
            ? <>Approximate: the sum of {counted.length} {counted.length === 1 ? "county" : "counties"} where at least half the residents live inside the boundary ({named(counted)}). The boundary cuts {cut.map(([g, sh]) => `${names[g]} (${pct(sh)} of residents inside)`).join(", ")}; a cut county counts in full when at least half its residents are inside, otherwise not at all (2020 Census).</>
            : <>The sum of its {counted.length} whole {counted.length === 1 ? "county" : "counties"}: {named(counted)}.</>}
          {" "}Margins of error are at 90% confidence, combined as the Census Bureau does.
        </p>
      )}
    </div>
  );
}
