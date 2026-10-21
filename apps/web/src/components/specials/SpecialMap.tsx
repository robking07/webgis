"use client";
// The map in a Special (D-115): one dataset as a choropleth or two as the bivariate map, by county,
// with its legend. Cooperative gestures, so it never traps the page's scrolling. The compare page
// (D-258) uses it too, with both places outlined.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { BivariateLegend, Legend, StatusState } from "@webgis/design/components";
import type { GeoLevel, ThemeName } from "@webgis/design";
import { DATASET_BY_ID } from "@/lib/registry";
import { classifyBivariate, classifyUnivariate, loadValues, type Values } from "@/lib/values";
import { DEFAULT_VIEW } from "@/lib/url-state";
import type { Bbox } from "../map/MapView";

const MapView = dynamic(() => import("../map/MapView").then((m) => m.MapView), { ssr: false });

// The page's resolved theme: an explicit data-theme (Settings), else the system setting.
function subscribeTheme(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  mq.addEventListener("change", cb);
  return () => { mo.disconnect(); mq.removeEventListener("change", cb); };
}
const readTheme = (): ThemeName => {
  const t = document.documentElement.dataset.theme;
  return t === "dark" || t === "light" ? t : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export function SpecialMap({ datasets, at, level = "county", legendBelow = false, designWidth, poster, className, children, compare, legend: showLegend = true }: {
  datasets: readonly string[];
  at: { lon: number; lat: number; zoom: number } | null;
  /** Geography drawn: county (default), or tract for a single dataset that has tracts (D-122); state on the compare page. */
  level?: Extract<GeoLevel, "state" | "county" | "tract">;
  /** Always put the legend under the map (inline focus maps, where an overlay would cover too much). */
  legendBelow?: boolean;
  /** Width (px) the `at` zoom was chosen for. A narrower box (a phone) zooms out to keep the same area in view. */
  designWidth?: number;
  /** The piece's thumbnail (a screenshot of this map), shown while the live map loads. */
  poster?: string | null;
  /** Sizing (aspect ratio) for the map box. */
  className?: string;
  /** Overlays drawn on the map (a tag, a button). */
  children?: React.ReactNode;
  /** Compare places (D-258, D-330): outline these two places of `level` and frame the `fit` one. */
  compare?: { a: string; b: string; bbox: Bbox; fit: "a" | "b" };
  /** False: no legend (the second of two maps side by side, which share one). */
  legend?: boolean;
}) {
  const x = DATASET_BY_ID.get(datasets[0])!, y = datasets[1] ? DATASET_BY_ID.get(datasets[1])! : null;
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as ThemeName);
  const [vals, setVals] = useState<Values[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    Promise.all([x, ...(y ? [y] : [])].map((d) => loadValues(d.id, level))).then(setVals, () => setErr(true));
  }, [x, y, level]);
  const paint = useMemo(() => {
    if (!vals) return null;
    return y ? { kind: "biv" as const, ...classifyBivariate(vals[0], vals[1]) } : { kind: "uni" as const, ...classifyUnivariate(x, vals[0]) };
  }, [vals, x, y]);
  // The box's width once it's on the page, to fit `at` to narrower screens.
  const [width, setWidth] = useState<number | null>(null);
  const measure = (el: HTMLDivElement | null) => { if (el && width == null) setWidth(el.clientWidth); };
  const view = !at ? { ...DEFAULT_VIEW }
    : designWidth && width ? { ...at, zoom: at.zoom + Math.log2(Math.min(1, width / designWidth)) } : { ...at };
  const by = `by ${level === "tract" ? "census tract" : level}`;
  const label = y ? `Map of ${x.title} and ${y.title} ${by}` : `Map of ${x.title} ${by}`;
  const legend = !paint || !showLegend ? null : paint.kind === "biv"
    ? <BivariateLegend xTitle={x.title} yTitle={y!.title} colors={paint.colors} />
    : <Legend title={x.title} unit={x.unit} colors={paint.colors} breaks={paint.breaks} minClass={paint.minClass} />;

  // Wider screens float the legend on the map; phones (and inline maps) put it below, where it doesn't cover the map.
  return (
    <div className="flex flex-col gap-2">
      <div ref={measure} className={`relative overflow-hidden rounded-xl border bg-card ${className ?? ""}`}>
        {/* The thumbnail sits under the live map, so the box shows the map at once and the live one draws over it. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- static thumbnail, same box as the map */}
        {poster && !err && <img src={poster} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />}
        {err ? <div className="grid h-full place-items-center"><StatusState status="error" /></div>
          : !paint || (designWidth && width == null) ? (poster ? null : <div className="grid h-full place-items-center"><StatusState status="loading" /></div>) : (
          <>
            <MapView theme={theme} initialView={view} paint={{ [level]: paint }}
              levelZooms={{ [level]: { minzoom: 0, maxzoom: 24 } }} cooperative compare={compare && { level, ...compare }}
              onViewChange={() => {}} onHover={() => {}} ariaLabel={label} />
            {!legendBelow && legend && <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden rounded-lg border bg-card/95 p-2 text-xs shadow-sm md:block">{legend}</div>}
          </>
        )}
        {children}
      </div>
      {legend && <div className={`text-xs ${legendBelow ? "" : "md:hidden"}`}>{legend}</div>}
    </div>
  );
}
