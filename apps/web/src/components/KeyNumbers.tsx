"use client";
// The place profile's header (issue #364): six neutral ACS numbers, each with its margin of error.
// Residents come from the population map's published counts; the rest are the maps' own values.
import { useEffect, useState } from "react";
import { formatEstimate, isGradable } from "@webgis/design";
import { placeCounts } from "@/lib/counts";
import { reliabilityNote } from "@/lib/reliability";
import { DATASET_BY_ID } from "@/lib/registry";
import type { Detail } from "./PlaceDataList";

// Issue #443: the numbers planners re-key into every SS4A / BUILD / TA application. Same row shape, own sub-heading; the CSV already carries them.
const GRANT = ["pct_poverty", "pct_zero_vehicle_households", "pct_disability", "pct_age_65_plus", "pct_limited_english", "traffic_fatalities"];
const KEY = ["median_household_income", "median_age", "median_home_value", "mean_commute_minutes", "pct_bachelors_plus"];

export function KeyNumbers({ geoid, detail }: { geoid: string; detail: Detail }) {
  const [residents, setResidents] = useState<{ value: number | null; moe: number | null } | null>(null);
  useEffect(() => {
    let live = true;
    placeCounts("population_density", geoid).then((c) => live && c && setResidents({ value: c[0], moe: c[1] }), () => {});
    return () => { live = false; };
  }, [geoid]);
  const rowsOf = (ids: string[]) => ids.flatMap((id) => {
    const d = DATASET_BY_ID.get(id), r = detail[id];
    return d && r?.value != null ? [{ id, label: d.title, unit: d.unit, gradable: isGradable(d.measure.kind), ...r }] : [];
  });
  const items = [
    ...(residents?.value != null ? [{ id: "residents", label: "Residents", unit: "count" as const, gradable: true, ...residents }] : []),
    ...rowsOf(KEY),
  ];
  const grant = rowsOf(GRANT);
  if (!items.length && !grant.length) return null;
  const vintage = DATASET_BY_ID.get(KEY[0])?.vintage.replace(/ \(.*\)$/, "");
  const grid = (list: typeof items) => (
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
        {list.map((it) => {
          const est = formatEstimate(it.value, it.moe, it.unit);
          const note = it.gradable ? reliabilityNote(it.value, it.moe)?.title : null;
          return (
            <div key={it.id} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{it.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {est.value}
                {est.moe && <span className="ml-1 text-xs font-normal text-muted-foreground">±{est.moe}</span>}
              </dd>
              {note && <dd className="text-xs font-medium text-foreground">{note}</dd>}
            </div>
          );
        })}
      </dl>
  );
  return (
    <section aria-label="Key numbers" className="mb-6" data-key-numbers="">
      {items.length > 0 && grid(items)}
      {items.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">American Community Survey, {vintage}. ± is the 90% margin of error.</p>}
      {grant.length > 0 && (
        <div data-grant-numbers="" className={items.length ? "mt-4" : ""}>
          <h2 className="mb-1.5 text-sm font-medium">For grant applications</h2>
          {grid(grant)}
          {/* Each map has its own period and source; the CSV download lists them per row. */}
          <p className="mt-1.5 text-xs text-muted-foreground">Period and source for each number are in the downloaded CSV. ± is the margin of error where the source gives one.</p>
        </div>
      )}
    </section>
  );
}
