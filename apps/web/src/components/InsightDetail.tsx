"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BivariateLegend, StatusState } from "@webgis/design/components";
import type { ThemeName } from "@webgis/design";
import { Scatter } from "./Scatter";
import { Stats } from "./InsightCard";
import { DATASET_BY_ID } from "@/lib/registry";
import { classifyBivariate, loadValues, type Values } from "@/lib/values";
import type { Insight } from "@/lib/insights";
import { DEFAULT_VIEW, serializeUrlState } from "@/lib/url-state";

const MapView = dynamic(() => import("./map/MapView").then((m) => m.MapView), { ssr: false });

export function InsightDetail({ insight }: { insight: Insight }) {
  const x = DATASET_BY_ID.get(insight.x)!, y = DATASET_BY_ID.get(insight.y)!;
  const [vals, setVals] = useState<[Values, Values] | null>(null);
  const [names, setNames] = useState<Record<string, string>>();
  const [err, setErr] = useState(false);
  const [theme, setTheme] = useState<ThemeName>("light");
  useEffect(() => {
    Promise.all([loadValues(x.id, "county"), loadValues(y.id, "county")]).then(setVals, () => setErr(true));
    fetch("/data/geo/names.json").then((r) => r.json()).then(setNames, () => {});
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && mq.matches) ? "dark" : "light");
  }, [x.id, y.id]);
  const biv = useMemo(() => (vals ? classifyBivariate(vals[0], vals[1]) : null), [vals]);
  const mapHref = `/${serializeUrlState({ d: x.id, b: y.id, at: { ...DEFAULT_VIEW, zoom: 5 }, theme: null, lv: null })}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <nav className="mb-6 flex gap-4 text-sm">
        <a href="/specials" className="text-primary underline-offset-2 hover:underline">← All Odd Pairings</a>
        <a href={mapHref} className="text-primary underline-offset-2 hover:underline">Explore in the full map →</a>
      </nav>
      <header className="mb-6 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">{insight.headline}</h1>
        <p className="mt-2 text-muted-foreground">{insight.caption}</p>
        <div className="mt-2"><Stats insight={insight} /></div>
        <p className="mt-3 rounded-lg border bg-card p-3 text-sm">
          <strong>Correlation is not causation.</strong> This shows that the two measures line up across counties, not that one drives the
          other. County averages can also hide very different patterns among the people inside them.
        </p>
      </header>
      {err ? <StatusState status="error" /> : !vals || !biv ? <StatusState status="loading" /> : (
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <section aria-label="Map" className="relative h-[420px] overflow-hidden rounded-xl border">
            <MapView theme={theme} initialView={{ ...DEFAULT_VIEW, zoom: 3.2 }} paint={{ county: biv }} levelZooms={{ county: { minzoom: 0, maxzoom: 24 } }}
              onViewChange={() => {}} onHover={() => {}} onSelect={() => {}}
              ariaLabel={`Bivariate map of ${x.title} and ${y.title} by county`} />
            <div className="absolute left-3 top-3 z-10 rounded-lg border bg-card/95 p-2 shadow-sm">
              <BivariateLegend xTitle={x.title} yTitle={y.title} colors={biv.colors} />
            </div>
          </section>
          <section aria-label="Scatter plot" className="rounded-xl border bg-card p-3">
            <Scatter x={x} y={y} xv={vals[0]} yv={vals[1]} names={names} />
            <p className="mt-2 text-xs text-muted-foreground">Each dot is a county. Sources: {x.source.citation}; {y.source.citation}.</p>
          </section>
        </div>
      )}
    </main>
  );
}
