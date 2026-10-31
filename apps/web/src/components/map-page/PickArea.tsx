"use client";
// Pick an area (#455): the hand-picked tracts' bar ("N tracts picked · Done · Clear") and their total
// for the map(s) on screen, added up exactly as an MPO's tracts are (lib/counts sumCounts, RegionTotal's rows).
import { useEffect, useState } from "react";
import { countsLabels, placeCounts, sumCounts, type Counts } from "@/lib/counts";
import type { Dataset } from "@/lib/registry";
import { TotalRow } from "./RegionTotal";

export const PICK_MAX = 50;

/** After Done the total stays (the map's "Pick tracts" button picks more) until Clear. */
export function PickArea({ datasets, picked, picking, full, onDone, onClear }: {
  datasets: Dataset[];
  picked: string[];
  picking: boolean;
  /** A tap was refused at PICK_MAX. */
  full: boolean;
  onDone: () => void;
  onClear: () => void;
}) {
  const key = picked.join(",");
  const ids = datasets.filter((d) => countsLabels(d.id)).map((d) => d.id).join(" ");
  // Totals for this exact pick, so a stale sum never shows beside a newer count.
  const [totals, setTotals] = useState<{ key: string; c: Record<string, Counts | null> }>({ key: "", c: {} });
  useEffect(() => {
    if (!key) return;
    let live = true;
    const geoids = key.split(",");
    for (const id of ids ? ids.split(" ") : []) {
      Promise.all(geoids.map((g) => placeCounts(id, g))).then((rows) => live && setTotals((t) => ({ key, c: { ...(t.key === key ? t.c : {}), [id]: sumCounts(rows) } })));
    }
    return () => { live = false; };
  }, [key, ids]);
  // Esc leaves picking (before the page's own Esc, which would bring the chrome back).
  useEffect(() => {
    if (!picking) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onDone(); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [picking, onDone]);
  const n = picked.length;
  const btn = "wg-zbtn h-11 rounded-full px-4 text-sm font-semibold text-foreground";
  return (
    <section aria-label="Picked area" data-pick-area=""
      className="absolute inset-x-3 bottom-6 z-20 flex max-h-[45%] flex-col gap-1 md:left-[18rem] md:right-auto md:w-80">
      {n > 0 && (
        <div className="wg-panel min-h-0 space-y-2 overflow-y-auto rounded-xl px-3 py-2" data-pick-total="">
          {datasets.map((d) => (
            <TotalRow key={d.id} d={d} c={totals.key === key ? totals.c[d.id] : undefined} across="tracts" missing="No total: a tract’s numbers are missing." />
          ))}
          <p className="text-xs text-muted-foreground">The sum of {n} 2020 census {n === 1 ? "tract" : "tracts"}. Margins of error are at 90% confidence, combined as the Census Bureau does.</p>
        </div>
      )}
      <div className="wg-panel flex items-center gap-1 rounded-full py-0.5 pl-4 pr-0.5">
        <p className="mr-auto text-sm tabular-nums text-foreground" aria-live="polite">
          {full ? `${PICK_MAX} tracts picked, the most allowed` : n ? `${n} ${n === 1 ? "tract" : "tracts"} picked` : "Pick tracts on the map"}
        </p>
        {picking && <button type="button" onClick={onDone} className={btn}>Done</button>}
        <button type="button" onClick={onClear} className={btn}>Clear</button>
      </div>
    </section>
  );
}
