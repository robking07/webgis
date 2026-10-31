"use client";
// Every dataset, filterable with the shared dataset filter, grouped by source.
import { useMemo } from "react";
import { GEO_LEVELS, type GeoLevel } from "@webgis/design";
import { StatusState } from "@webgis/design/components";
import { DatasetFilter, useDatasetFilter } from "./DatasetFilter";
import { SOURCES, datasetHref } from "@/lib/sources";

export function DataDirectory() {
  const { q, setQ, cat, setCat, results } = useDatasetFilter();
  const ids = useMemo(() => new Set(results.map((d) => d.id)), [results]);
  const groups = SOURCES.map((s) => ({ ...s, shown: s.datasets.filter((d) => ids.has(d.id)) })).filter((s) => s.shown.length);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3">
        <DatasetFilter q={q} setQ={setQ} cat={cat} setCat={setCat} />
        <p className="text-xs text-muted-foreground">{results.length} of {SOURCES.reduce((n, s) => n + s.datasets.length, 0)} datasets · {groups.length} sources</p>
      </div>
      {groups.length === 0 ? <StatusState status="empty" message="No datasets match." /> : groups.map((s) => (
        <section key={s.slug} id={s.slug} aria-labelledby={`h-${s.slug}`} className="mb-8 scroll-mt-6">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4">
            <h2 id={`h-${s.slug}`} className="text-base font-semibold">{s.name}</h2>
            <a href={s.url} className="text-xs text-primary underline-offset-2 hover:underline" rel="noopener">Source website ↗</a>
          </div>
          <ul className="divide-y rounded-xl border bg-card">
            {s.shown.map((d) => (
              <li key={d.id}>
                <a href={datasetHref(d.id)} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{d.title}</span>
                    <span className="block text-xs text-muted-foreground">{d.description}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground sm:text-right">
                    {d.category} › {d.subcategory} · {d.vintage}
                    <span className="block">{d.measure.kind === "features" ? d.measure.noun ?? "Features" : d.geographyLevels.map((l) => GEO_LEVELS[l as GeoLevel].plural).join(", ")}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
