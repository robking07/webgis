"use client";
// All datasets for one place, filterable with the shared dataset filter. Used by the
// place profile page and by the map's bottom drawer when it's swiped open.
import { Fragment, useEffect, useMemo, useState } from "react";
import { formatEstimate, isGradable, type GeoLevel } from "@webgis/design";
import { StatusState } from "@webgis/design/components";
import { DatasetFilter, useDatasetFilter } from "./DatasetFilter";
import { Benchmarks } from "./Benchmarks";
import { loadValues, type Values } from "@/lib/values";
import { rankText } from "@/lib/place";
import { noDataReason, reliabilityNote } from "@/lib/reliability";
import { CATEGORIES, DATASET_BY_ID, type Dataset } from "@/lib/registry";

export type Detail = Record<string, { value: number | null; moe: number | null }>;

/** One "Map it" per row reads as noise in a 28-row list: hidden until hover/focus on mouse devices. */
const MAP_IT = "text-xs text-primary underline-offset-2 hover:underline [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 focus-visible:opacity-100";

/** Context notes (wording approved by Robbie 2026-10-29, issue #411), shown once before the first row of their subcategory. */
const NOTES: Record<string, string> = {
  "Race and ethnicity": "These numbers count how people describe themselves to the Census Bureau. Differences between places reflect history, not the people in them: redlining, highway building through Black neighborhoods, exclusionary zoning and unequal lending shaped where people could live and what they could own. Many measures on this site, like income, housing cost, health and pollution, track race closely for the same reasons.",
  "Income and poverty": "Income and poverty here come from what households report to the Census Bureau. Low pay, housing costs and who owns what are shaped by policy (wages, taxes, zoning, public investment) as much as by individual choices.",
};

interface Props {
  geoid: string;
  level: GeoLevel;
  detail: Detail;
  /** Either a link per dataset… */
  mapHref?: (id: string) => string;
  /** …or a callback that switches the map in place. */
  onMapIt?: (id: string) => void;
  compact?: boolean;
}

export function PlaceDataList({ geoid, level, detail, mapHref, onMapIt, compact }: Props) {
  const { q, setQ, cat, setCat, results } = useDatasetFilter();
  const [ranks, setRanks] = useState<Record<string, string>>({});

  // Rank lines from the static exports. Tract and block-group files are large, so they skip ranks.
  useEffect(() => {
    if (level === "tract" || level === "block_group") return;
    let live = true;
    for (const [id, r] of Object.entries(detail)) {
      if (r.value == null) continue;
      // Only levels the dataset exports (county-only datasets have no state file to rank against).
      if (!DATASET_BY_ID.get(id)?.geographyLevels.includes(level)) continue;
      loadValues(id, level).then((vals: Values) => {
        const t = rankText(vals, r.value, level);
        if (live && t) setRanks((s) => ({ ...s, [id]: t }));
      }, () => {});
    }
    return () => { live = false; };
  }, [detail, level]);

  const shown = new Set<string>();
  const grouped = useMemo(() => {
    const m = new Map<string, Dataset[]>();
    for (const d of results.filter((d) => detail[d.id])) (m.get(d.category) ?? m.set(d.category, []).get(d.category)!).push(d);
    return [...m].sort((a, b) => CATEGORIES.indexOf(a[0]) - CATEGORIES.indexOf(b[0]));
  }, [results, detail]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 print:hidden"><DatasetFilter q={q} setQ={setQ} cat={cat} setCat={setCat} placeholder="Filter this place's data…" /></div>
      {grouped.length === 0 ? <StatusState status="empty" message="No datasets match." /> : grouped.map(([category, ds]) => (
        <section key={category} aria-label={category}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</h3>
          <ul className="divide-y rounded-xl border bg-card">
            {ds.map((d) => {
              const r = detail[d.id];
              const est = formatEstimate(r.value, r.moe, d.unit);
              // Why there's no value, or the D-222 grade's title for a shaky survey estimate.
              const note = r.value == null ? noDataReason(d, geoid) : isGradable(d.measure.kind) ? reliabilityNote(r.value, r.moe)?.title : null;
              const ctx = NOTES[d.subcategory] && !shown.has(d.subcategory) ? NOTES[d.subcategory] : null;
              if (ctx) shown.add(d.subcategory);
              return (
                <Fragment key={d.id}>
                {ctx && <li data-context-note={d.subcategory} className="bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{ctx}</li>}
                <li className={`group flex items-center justify-between gap-3 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium"><a href={`/data/${d.id}`} className="rounded underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{d.title}</a></p>
                    <p className="text-xs text-muted-foreground">{ranks[d.id] ? `${ranks[d.id]} · ` : ""}{d.vintage}</p>
                    {r.value != null && <Benchmarks dataset={d} geoid={geoid} />}
                    {note && <p className="text-xs font-medium text-foreground" data-value-note="">{note}</p>}
                    <p className="hidden text-xs text-muted-foreground print:block" data-print-source="">Source: {d.source.name}</p>
                  </div>
                  <div className="shrink-0 text-right print:[&_a]:hidden print:[&_button]:hidden">
                    <p className="text-sm font-semibold tabular-nums">
                      {est.value}
                      {est.moe && <span className="ml-1 text-xs font-normal text-muted-foreground">±{est.moe}</span>}
                    </p>
                    {/* "Map it" shows on row hover/focus where there's a mouse; touch screens always show it. */}
                    {onMapIt ? (
                      <button type="button" onClick={() => onMapIt(d.id)} aria-label={`Map ${d.title}`} className={`${MAP_IT} rounded focus-visible:outline-2 focus-visible:outline-ring`}>Map it</button>
                    ) : mapHref ? (
                      <a href={mapHref(d.id)} aria-label={`Map ${d.title}`} className={MAP_IT}>Map it</a>
                    ) : null}
                  </div>
                </li>
                </Fragment>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">± is the ACS 90% margin of error, or the PLACES 95% interval.</p>
    </div>
  );
}
