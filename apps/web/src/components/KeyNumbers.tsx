"use client";
// The place profile's header (issue #364): six neutral ACS numbers, each with its margin of error.
// Residents come from the population map's published counts; the rest are the maps' own values.
import { useEffect, useState } from "react";
import { formatEstimate, isGradable } from "@webgis/design";
import { placeCounts } from "@/lib/counts";
import { reliabilityNote } from "@/lib/reliability";
import { DATASET_BY_ID } from "@/lib/registry";
import type { Detail } from "./PlaceDataList";

const KEY = ["median_household_income", "median_age", "median_home_value", "mean_commute_minutes", "pct_bachelors_plus"];

export function KeyNumbers({ geoid, detail }: { geoid: string; detail: Detail }) {
  const [residents, setResidents] = useState<{ value: number | null; moe: number | null } | null>(null);
  useEffect(() => {
    let live = true;
    placeCounts("population_density", geoid).then((c) => live && c && setResidents({ value: c[0], moe: c[1] }), () => {});
    return () => { live = false; };
  }, [geoid]);
  const items = [
    ...(residents?.value != null ? [{ id: "residents", label: "Residents", unit: "count" as const, gradable: true, ...residents }] : []),
    ...KEY.flatMap((id) => {
      const d = DATASET_BY_ID.get(id), r = detail[id];
      return d && r?.value != null ? [{ id, label: d.title, unit: d.unit, gradable: isGradable(d.measure.kind), ...r }] : [];
    }),
  ];
  if (!items.length) return null;
  const vintage = DATASET_BY_ID.get(KEY[0])?.vintage.replace(/ \(.*\)$/, "");
  return (
    <section aria-label="Key numbers" className="mb-6" data-key-numbers="">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
        {items.map((it) => {
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
      <p className="mt-1.5 text-xs text-muted-foreground">American Community Survey, {vintage}. ± is the 90% margin of error.</p>
    </section>
  );
}
