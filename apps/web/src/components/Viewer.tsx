"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Info, Menu, Minus, Plus, SlidersHorizontal, X } from "lucide-react";
import { BivariateLegend, Legend, Popup, StatusState } from "@webgis/design/components";
import { featureLineColors, formatValue, GEO_LEVELS, levelAtZoom, levelBands, type GeoLevel, type ThemeName } from "@webgis/design";
import { DatasetBrowser } from "./DatasetBrowser";
import { DataTable } from "./DataTable";
import { TERM_BY_ID } from "@/lib/glossary";
import type { Facet } from "@webgis/registry";
import { MapView, type FeatureHit, type HoverInfo, type LevelPaint, type MapApi } from "./map/MapView";
import { DATASET_BY_ID, DATASETS, type Dataset } from "@/lib/registry";
import { placeHref, rankText } from "@/lib/place";
import { F_SYSTEM, featureLayerSpec, isFeatureDataset, type FeatureLayerSpec } from "@/lib/layers";
import type { PopupRow } from "@webgis/design/components";
import { BottomSheet, useIsPhone } from "./BottomSheet";
import { PlaceDataList, type Detail } from "./PlaceDataList";
import { parseUrlState, useUrlState, type UrlState } from "@/lib/url-state";
import { LANDING } from "@/lib/landing";
import { readStoredTheme, useResolvedTheme } from "@/lib/theme";
import { HeaderContent } from "./SiteHeader";
import { LogoMark } from "./Logo";
import { classifyBivariate, classifyUnivariate, useDatasetValues, type Values } from "@/lib/values";
import { fetchDetail } from "@/lib/supabase";

const LEVELS = Object.keys(GEO_LEVELS) as GeoLevel[];

export function Viewer({ search }: { search: string }) {
  const [initial] = useState<UrlState>(() => {
    const parsed = parseUrlState(search);
    // A theme chosen on another page carries over (client-only render, so storage is readable here).
    const s = { ...parsed, theme: parsed.theme ?? readStoredTheme() };
    if (s.d && DATASET_BY_ID.has(s.d)) return { ...s, b: s.b && DATASET_BY_ID.has(s.b) ? s.b : null };
    // No dataset in the URL: the featured landing view (lib/landing.ts).
    const d = DATASET_BY_ID.has(LANDING.d) ? LANDING.d : DATASETS[0]?.id ?? null;
    const b = LANDING.b && DATASET_BY_ID.has(LANDING.b) ? LANDING.b : null;
    return { ...s, d, b, at: new URLSearchParams(search).has("at") ? s.at : LANDING.at ?? s.at };
  });
  const [state, update] = useUrlState(initial);
  const theme = useResolvedTheme(state.theme);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [selected, setSelected] = useState<HoverInfo | null>(null);
  const [featureHover, setFeatureHover] = useState<FeatureHit | null>(null);
  const [featureSelected, setFeatureSelected] = useState<FeatureHit | null>(null);
  const [tilesError, setTilesError] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  // Phone layout only (below md): the dataset list and full legend start collapsed so
  // the map gets the screen. Desktop always shows both (CSS md: overrides).
  const [browserOpen, setBrowserOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [immersed, setImmersed] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  /** Feature-layer facet filters: field → values HIDDEN by the user. */
  const [hidden, setHidden] = useState<Record<string, Set<string>>>({});
  const [peek, setPeek] = useState(false);
  const mapApi = useRef<MapApi | null>(null);
  // Esc brings the chrome back (panels handle their own Esc first).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setImmersed(false); setPeek(false); setBrowserOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const primary = state.d ? DATASET_BY_ID.get(state.d)! : null;
  // Feature layers (roads, transit…) draw their own geometry: no choropleth, no comparison.
  const isFeature = isFeatureDataset(primary);
  const featureSpec = useMemo(() => (primary && isFeature ? featureLayerSpec(primary) : null), [primary, isFeature]);
  const secondary = state.b && !isFeature && !isFeatureDataset(DATASET_BY_ID.get(state.b)) ? DATASET_BY_ID.get(state.b)! : null;
  // Levels both datasets have, and the zoom band each level is drawn at.
  const availableLevels = useMemo(() => isFeature ? [] : LEVELS.filter((l) => (!primary || primary.geographyLevels.includes(l)) && (!secondary || secondary.geographyLevels.includes(l))), [primary, secondary, isFeature]);
  // "Display options" can pin one level at every zoom; otherwise levels switch with zoom.
  const pinnedLevel = state.lv && availableLevels.includes(state.lv) ? state.lv : null;
  const bands = useMemo(() => (pinnedLevel ? { [pinnedLevel]: { minzoom: 0, maxzoom: 24 } } : levelBands(availableLevels)), [availableLevels, pinnedLevel]);
  // Start loading tract values a little before tracts appear.
  const wantTract = !!bands.tract && state.at.zoom >= bands.tract.minzoom - 1;
  const x = useDatasetValues(primary, wantTract);
  const y = useDatasetValues(secondary, wantTract);
  const level = levelAtZoom(bands, state.at.zoom) ?? availableLevels[0] ?? "county";

  const classed = useMemo(() => {
    const out: Partial<Record<GeoLevel, LevelPaint & { breaks?: number[]; xBreaks?: number[]; yBreaks?: number[]; minClass?: number }>> = {};
    if (!primary) return out;
    for (const l of LEVELS) {
      const xv = x.values[l];
      if (!xv) continue;
      if (secondary) {
        const yv = y.values[l];
        if (yv) out[l] = classifyBivariate(xv, yv);
      } else {
        out[l] = classifyUnivariate(primary, xv);
      }
    }
    return out;
  }, [primary, secondary, x.values, y.values]);

  const current = classed[level];
  const error = x.error ?? y.error;
  const available = !!primary && !isFeature && availableLevels.includes(level);
  // Clear selections and filters when the dataset changes.
  useEffect(() => { setSelected(null); setFeatureSelected(null); setFeatureHover(null); setHidden({}); }, [state.d]);
  const featureFilter = useMemo(() => {
    if (!primary) return undefined;
    const out: Record<string, Array<string | number>> = {};
    for (const f of primary.facets) {
      const h = hidden[f.field];
      if (h?.size) out[f.field] = f.values.map((v) => v.value).filter((v) => !h.has(String(v)));
    }
    return out;
  }, [primary, hidden]);
  const toggleFacet = (field: string, value: string) => setHidden((cur) => {
    const next = new Set(cur[field] ?? []);
    if (next.has(value)) next.delete(value); else next.add(value);
    return { ...cur, [field]: next };
  });
  const onTableClose = useCallback(() => setTableOpen(false), []);
  const onTablePick = useCallback((geoid: string, name: string, lon: number, lat: number) => {
    mapApi.current?.flyTo(lon, lat, level === "state" ? 5.2 : 8.2);
    mapApi.current?.select(level, geoid);
    setSelected({ geoid, name, level, x: 0, y: 0 });
    if (window.matchMedia("(max-width: 767px)").matches) setTableOpen(false);
  }, [level]);
  const loading = available && !current && !error;

  // ── Map-first chrome (D-25) ─────────────────────────────────────────────────
  // At rest: slim header, dataset card, full legend. The first user pan/zoom/scroll
  // "immerses": the navigation falls away entirely, leaving the wordmark, the dataset
  // heading and the legend strip on the map. The menu button, the top screen edge,
  // or Esc brings it back.
  // Line layers reverse their ramp on dark land (see featureLineColors); the legend follows the map.
  const featureColors = featureSpec && (featureSpec.geometry === "line" ? featureLineColors(featureSpec.colors, theme) : featureSpec.colors);
  const legendStrip = primary && (featureColors || current?.colors);
  const legendEnds = featureSpec
    ? [`< ${formatValue(featureSpec.breaks[0], primary!.unit)}`, `≥ ${formatValue(featureSpec.breaks[featureSpec.breaks.length - 1], primary!.unit)}`]
    : current?.breaks?.length ? [`< ${formatValue(current.breaks[0], primary!.unit)}`, `≥ ${formatValue(current.breaks[current.breaks.length - 1], primary!.unit)}`] : null;
  const chromeShown = !immersed || peek;
  // Legend: once the user is exploring (immersed), desktop shows it in full for context;
  // it shrinks to its strip only while Display options needs the room. Phones keep the strip
  // (tap to expand) so the map isn't covered.
  const desktopStrip = optionsOpen && !immersed;
  const filtersActive = Object.values(hidden).some((h) => h.size > 0);
  const featureNoun = featureSpec?.geometry === "polygon" ? "Census tracts (2010)" : "Road segments";
  const meta = primary ? [isFeature ? featureNoun : GEO_LEVELS[level].label, primary.vintage, primary.source.name.split(",")[0].split(" (")[0]].join(" · ") : "";
  const legendBody = (
    <>
      {primary && isFeature ? (featureSpec ? (
          <Legend title={primary.title} unit={primary.unit} colors={featureColors!} breaks={featureSpec.breaks} showNoData={false} swatch={featureSpec.geometry === "line" ? "line" : "area"}
            caption={`${primary.vintage} · ${featureSpec.featureCount.toLocaleString()} ${featureSpec.geometry === "line" ? "segments · wider lines = higher road class" : "areas"}${primary.coverageNote ? `. ${primary.coverageNote}` : ""}`} />
        ) : <StatusState status="empty" message="This layer hasn't been built yet." />)
        : error ? <StatusState status="error" message={error} />
        : primary && !available ? <StatusState status="empty" message="These two datasets don't share a geography level, so they can't be compared." />
        : loading ? <StatusState status="loading" message="Loading data…" />
        : primary && secondary && current?.xBreaks ? (
          <BivariateLegend xTitle={primary.title} yTitle={secondary.title} colors={current.colors} />
        ) : primary && current?.breaks ? (
          <Legend title={primary.title} unit={primary.unit} colors={current.colors} breaks={current.breaks} minClass={current.minClass}
            caption={`${GEO_LEVELS[level].label} · ${primary.vintage}${primary.coverageNote ? `. ${primary.coverageNote}` : ""}`} />
        ) : null}
    </>
  );

  return (
    <div className="fixed inset-0 overflow-hidden"
      onMouseMove={(e) => { if (immersed && !peek && e.clientY < 14) setPeek(true); }}>
      <button type="button" onClick={() => setBrowserOpen(true)}
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:shadow">Choose a dataset</button>

      <main className="absolute inset-0">
        <MapView
          theme={theme}
          initialView={initial.at}
          paint={classed}
          onViewChange={(at) => update({ at })}
          onHover={setHover}
          onSelect={setSelected}
          onTilesError={setTilesError}
          levelZooms={bands}
          featureLayer={featureSpec}
          featureFilter={featureFilter}
          onFeatureHover={setFeatureHover}
          onFeatureSelect={setFeatureSelected}
          onUserMove={() => { if (!browserOpen) { setImmersed(true); setPeek(false); } }}
          onApi={(api) => { mapApi.current = api; }}
          ariaLabel={primary ? `Map of ${primary.title}${secondary ? ` compared with ${secondary.title}` : ""} by ${GEO_LEVELS[level].label.toLowerCase()}` : "Map"}
        />
      </main>

      {/* Header: falls away entirely when immersed; peeks back at the top edge. */}
      <header onMouseLeave={() => setPeek(false)}
        className={`absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur transition-transform duration-300 ease-out md:px-6 ${chromeShown ? "translate-y-0" : "-translate-y-full"}`}
        aria-hidden={!chromeShown || undefined} inert={!chromeShown || undefined}>
        <HeaderContent current="map" onSearch={() => setBrowserOpen(true)} theme={theme} onTheme={(t) => update({ theme: t })} />
      </header>

      {/* At rest: the factual dataset card. */}
      {primary && (
        <section aria-label="Mapped dataset"
          className={`absolute left-3 right-3 top-[68px] z-20 rounded-lg border bg-card p-3 shadow-sm transition-all duration-300 md:left-4 md:right-auto md:w-80 md:p-4 ${immersed ? "pointer-events-none -translate-y-3 opacity-0" : "opacity-100"}`}
          inert={immersed || undefined}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-muted-foreground">Mapped</span>
            <button type="button" onClick={() => setBrowserOpen(true)} className="rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">Change dataset</button>
          </div>
          <h1 className="mt-1 text-lg font-bold leading-snug tracking-tight md:text-xl">
            {primary.title}{secondary && <span className="font-semibold text-muted-foreground"> × {secondary.title}</span>}
          </h1>
          <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground md:text-[13px]">
            <span>{meta}</span>
            {primary.terms.length > 0 && (
              <button type="button" onClick={() => setExplainOpen((o) => !o)} aria-expanded={explainOpen} aria-label="What do these numbers mean?"
                className="mt-px shrink-0 rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-3.5" aria-hidden /></button>
            )}
          </p>
          {explainOpen && (
            <dl className="mt-2 space-y-1.5 rounded-md bg-muted p-2.5 text-[11.5px] leading-snug">
              {primary.terms.map((id) => TERM_BY_ID.get(id)).filter((t) => !!t).map((t) => (
                <div key={t!.id}><dt className="inline font-semibold">{t!.term}: </dt><dd className="inline">{t!.short}</dd></div>
              ))}
              <a href={`/data/${primary.id}#explainers`} className="block pt-0.5 text-primary hover:underline">More on the data page →</a>
            </dl>
          )}
          {/* Actions, then Display options: one wrapping row on phones (so Table and Compare are
              reachable there too, D-33 P3); on desktop Display options sits on its own line. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isFeature && <button type="button" onClick={() => setBrowserOpen(true)} className="rounded-md border px-2.5 py-1 text-[13px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Compare</button>}
            {available && current && <button type="button" onClick={() => setTableOpen(true)} className="rounded-md border px-2.5 py-1 text-[13px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Table</button>}
            <a href={`/data/${primary.id}`} className="rounded-md border px-2.5 py-1 text-[13px] text-foreground hover:bg-muted"><span className="md:hidden">About</span><span className="hidden md:inline">About this data</span></a>
            {/* Progressive disclosure: options stay tucked away until asked for. */}
            {(availableLevels.length > 1 || primary.facets.length > 0) && (
              <button type="button" onClick={() => setOptionsOpen((o) => !o)} aria-expanded={optionsOpen} aria-controls="display-options"
                className="flex items-center gap-1.5 rounded px-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:mt-1 md:basis-full md:px-0">
                <SlidersHorizontal className="size-3.5" aria-hidden /> <span className="md:hidden">Options</span><span className="hidden md:inline">Display options</span> <ChevronDown className={`size-3.5 transition-transform ${optionsOpen ? "rotate-180" : ""}`} aria-hidden />
              </button>
            )}
          </div>
          {optionsOpen && (
            <div id="display-options" className="mt-2 max-h-[45vh] space-y-4 overflow-y-auto border-t pt-3">
              {availableLevels.length > 1 && (
                <fieldset>
                  <legend className="mb-1.5 text-xs font-semibold">Geography level</legend>
                  <div role="radiogroup" aria-label="Geography level" className="flex flex-wrap gap-1.5">
                    {([null, ...availableLevels] as Array<GeoLevel | null>).map((l) => (
                      <button key={l ?? "auto"} type="button" role="radio" aria-checked={state.lv === l || (!l && !pinnedLevel)}
                        onClick={() => update({ lv: l })}
                        className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground aria-checked:border-primary aria-checked:bg-primary aria-checked:text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring">
                        {l ? GEO_LEVELS[l].label.replace("Census tract", "Tract") : "Auto"}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                    {pinnedLevel ? `Showing ${GEO_LEVELS[pinnedLevel].label.toLowerCase()} data at every zoom.` : "Auto switches from states to counties to tracts as you zoom in."}
                  </p>
                </fieldset>
              )}
              {primary.facets.map((f) => (
                <FacetFilter key={f.field} facet={f} hidden={hidden[f.field]} onToggle={(v) => toggleFacet(f.field, v)}
                  onAll={() => setHidden((cur) => ({ ...cur, [f.field]: new Set() }))} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Immersed: menu button, translucent wordmark, dataset name as a solid heading. */}
      {primary && (
        <div className={`pointer-events-none absolute left-3 top-3 z-20 flex flex-col gap-1 transition-opacity duration-300 md:left-4 ${immersed ? "opacity-100" : "opacity-0"}`}
          inert={!immersed || undefined} aria-hidden={!immersed || undefined}>
          <div className="pointer-events-auto flex items-center gap-3">
            <button type="button" onClick={() => { setImmersed(false); setPeek(false); }} aria-label="Show navigation"
              className="wg-glass grid size-10 place-items-center rounded-xl text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              <Menu className="size-[18px]" aria-hidden />
            </button>
            <span className="flex items-center gap-2" aria-hidden>
              <span className="wg-logo-on-map"><LogoMark size={34} /></span>
              <span className="wg-wordmark hidden text-[34px] font-extrabold tracking-tight md:inline">Mapwich</span>
            </span>
          </div>
          <button type="button" onClick={() => setBrowserOpen(true)} className="pointer-events-auto ml-0.5 flex items-baseline gap-2 text-left focus-visible:outline-2 focus-visible:outline-ring rounded">
            <span className="wg-on-map text-base font-bold text-foreground md:text-[17px]">{primary.title}</span>
            <span className="wg-on-map text-[13px] font-semibold text-foreground/80">{isFeature ? (featureSpec?.geometry === "polygon" ? "Tracts" : "Roads") : GEO_LEVELS[level].label} ▾</span>
          </button>
        </div>
      )}

      {/* Docked filters: the user set a filter, then zoomed in; keep it within reach (D-28).
          Transparent, with text halos and glass chips, under the immersed title. */}
      {primary && immersed && filtersActive && primary.facets.length > 0 && (
        <section aria-label="Active filters" className="wg-dock absolute left-3 top-[124px] z-20 max-h-[calc(100%-220px)] w-[min(18rem,calc(100%-1.5rem))] space-y-3 overflow-y-auto md:left-4">
          {primary.facets.map((f) => (
            <FacetFilter key={f.field} facet={f} hidden={hidden[f.field]} docked onToggle={(v) => toggleFacet(f.field, v)}
              onAll={() => setHidden((cur) => ({ ...cur, [f.field]: new Set() }))} />
          ))}
        </section>
      )}

      {/* Zoom: frosted pill (desktop; phones pinch-zoom). */}
      <div className={`wg-glass absolute right-3 z-20 hidden flex-col md:flex overflow-hidden rounded-[14px] transition-[top] duration-300 md:right-4 ${chromeShown && !immersed ? "top-[68px]" : "top-3"}`}>
        <button type="button" onClick={() => mapApi.current?.zoomIn()} aria-label="Zoom in" className="wg-zbtn grid size-11 place-items-center text-foreground"><Plus className="size-4" aria-hidden /></button>
        <span className="mx-2.5 h-px bg-foreground/15" aria-hidden />
        <button type="button" onClick={() => mapApi.current?.zoomOut()} aria-label="Zoom out" className="wg-zbtn grid size-11 place-items-center text-foreground"><Minus className="size-4" aria-hidden /></button>
      </div>

      {/* Legend: full card at rest on desktop; a strip when immersed or on phones (tap to expand). */}
      {legendStrip && legendEnds && !legendOpen && (
        <button type="button" onClick={() => setLegendOpen(true)} aria-expanded={false} aria-label={`Show legend for ${primary!.title}`}
          className={`wg-glass wg-glass-strong absolute bottom-6 left-3 z-20 max-w-[calc(100%-9rem)] items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs tabular-nums text-foreground focus-visible:outline-2 focus-visible:outline-ring md:left-4 md:max-w-none ${desktopStrip ? "flex" : "flex md:hidden"}`}>
          {/* The strip is a compact key: numbers only ("< 2.5K", "≥ 75K"); the unit is in the full legend. */}
          <span>{stripEnd(legendEnds[0])}</span>
          <span className="flex overflow-hidden rounded-sm" aria-hidden>
            {(secondary && current ? [current.colors[0], current.colors[4], current.colors[8]] : legendStrip).map((c, i) => <span key={i} className={featureSpec ? "h-1.5 w-4 self-center md:w-5" : "h-2 w-4 md:w-5"} style={{ background: c }} />)}
          </span>
          <span>{stripEnd(legendEnds[1])}</span>
        </button>
      )}
      <section aria-label="Legend"
        className={`absolute bottom-6 left-3 right-3 z-20 max-h-[55%] overflow-y-auto rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur md:left-4 md:right-auto md:max-h-[60%] md:w-64 ${legendOpen || !(legendStrip && legendEnds) ? "block" : desktopStrip ? "hidden" : "hidden md:block"} ${immersed ? "wg-legend-immersed" : ""}`}>
        {legendOpen && (
          <button type="button" onClick={() => setLegendOpen(false)} aria-label="Collapse legend"
            className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <ChevronDown className="size-4" />
          </button>
        )}
        {legendBody}
        {primary && available && current && (
          <button type="button" onClick={() => setTableOpen(true)}
            className="mt-2 rounded text-xs text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            View as table
          </button>
        )}
      </section>

      {/* Dataset browser: overlay panel (desktop) / sheet (phone). */}
      {browserOpen && (
        <section aria-label="Datasets" role="dialog" aria-modal="true"
          className="absolute inset-x-0 bottom-0 top-16 z-40 flex flex-col gap-3 rounded-t-2xl border bg-background p-4 shadow-xl md:inset-y-3 md:left-3 md:right-auto md:top-3 md:w-[380px] md:rounded-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Datasets</h2>
            <button type="button" onClick={() => setBrowserOpen(false)} aria-label="Close datasets" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" /></button>
          </div>
          <DatasetBrowser primary={state.d} secondary={state.b}
            onPrimary={(id) => { update({ d: id, b: state.b === id ? null : state.b }); setBrowserOpen(false); }}
            onSecondary={(id) => { update({ b: id }); setBrowserOpen(false); }} />
          <a href="/data" className="text-xs text-primary hover:underline">Browse the full data directory →</a>
        </section>
      )}

      {tableOpen && primary && (
        <DataTable level={level} x={primary} xv={x.values[level]} y={secondary} yv={y.values[level]} onClose={onTableClose} onPick={onTablePick} />
      )}

      {tilesError && (
        <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-lg border bg-card p-1 shadow-sm">
          <StatusState status="error" message="Boundary tiles aren't available yet." />
        </div>
      )}

      {hover && !selected && primary && (
        <div className="pointer-events-none absolute z-30 rounded-md border bg-popover p-2.5 shadow-md" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <Popup title={hover.name} subtitle={GEO_LEVELS[hover.level].label}
            rows={[primary, secondary].filter((d) => !!d).map((d) => ({
              label: d!.title, unit: d!.unit,
              value: (d === primary ? x : y).values[hover.level]?.[hover.geoid],
            }))} />
        </div>
      )}
      {featureHover && !featureSelected && featureSpec && (
        <div className="pointer-events-none absolute z-30 rounded-md border bg-popover p-2.5 shadow-md" style={{ left: featureHover.x + 14, top: featureHover.y + 14 }}>
          <Popup title={featureTitle(featureHover, featureSpec)} rows={featureRows(featureSpec, featureHover, primary?.facets).slice(0, 2)} />
        </div>
      )}
      {featureSelected && featureSpec && (
        <FeaturePanel hit={featureSelected} spec={featureSpec} facets={primary?.facets ?? []} onClose={() => setFeatureSelected(null)} belowHeader={chromeShown} />
      )}
      {selected && primary && (
        <DetailPanel info={selected} onClose={() => setSelected(null)} primary={primary} secondary={secondary} belowHeader={chromeShown}
          xv={x.values[selected.level]} yv={y.values[selected.level]}
          onMapIt={(id) => update({ d: id, b: state.b === id ? null : state.b })} />
      )}
    </div>
  );
}

interface DetailProps {
  info: HoverInfo;
  onClose: () => void;
  primary: Dataset;
  secondary: Dataset | null;
  /** Loaded values at the clicked feature's level, for the rank line. */
  xv?: Values;
  yv?: Values;
  /** Switch the map to another dataset (from the drawer's full list). */
  onMapIt: (id: string) => void;
  /** The header is showing, so the desktop panel starts below it. */
  belowHeader: boolean;
}

/** "< 2.5K vehicles/day" → "< 2.5K": the legend strip keeps the comparison and number, drops unit words. */
const stripEnd = (s: string) => s.replace(/^([<≥]\s*\S+).*$/, "$1");

/** Desktop detail panels sit under the header when it shows (the dataset card's offset), else at the top. */
const panelTop = (belowHeader: boolean) =>
  `transition-[top] duration-300 ${belowHeader ? "top-[68px] max-h-[calc(100%-80px)]" : "top-3 max-h-[calc(100%-1.5rem)]"}`;

function DetailPanel({ info, onClose, primary, secondary, xv, yv, onMapIt, belowHeader }: DetailProps) {
  const [rows, setRows] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const phone = useIsPhone();
  useEffect(() => {
    let live = true;
    setRows(null); setErr(null);
    fetchDetail(info.geoid).then((r) => live && setRows(r), (e) => live && setErr(String(e.message ?? e)));
    return () => { live = false; };
  }, [info.geoid]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const featured = [primary, secondary].filter((d): d is Dataset => !!d);
  const summary = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold leading-snug">{info.name}</h2>
          <p className="text-xs text-muted-foreground">{GEO_LEVELS[info.level].label}</p>
        </div>
        <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close details" className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <X className="size-4" />
        </button>
      </div>
      {err ? <StatusState status="error" message="Details are unavailable right now." />
        : !rows ? <StatusState status="loading" />
        : (
          <div className="space-y-2">
            {featured.map((d, i) => {
              const r = rows[d.id];
              const rank = rankText(i === 0 ? xv : yv, r?.value, info.level);
              return (
                <div key={d.id} className="rounded-md bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">{d.title}</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {formatValue(r?.value, d.unit)}
                    {r?.moe != null && r.moe > 0 && r.value != null && <span className="ml-1 text-xs font-normal text-muted-foreground">±{formatValue(r.moe, d.unit)}</span>}
                  </p>
                  {rank && <p className="text-xs text-muted-foreground">{rank}</p>}
                </div>
              );
            })}
          </div>
        )}
      {phone && rows && <p className="mt-2 text-center text-xs text-muted-foreground group-data-[snap=full]:hidden">Swipe up for all {Object.keys(rows).length} datasets here</p>}
    </>
  );

  if (phone) {
    return (
      <BottomSheet label={`Details for ${info.name}`} summary={summary} onClose={onClose}>
        {rows && (
          <>
            <PlaceDataList level={info.level} detail={rows} onMapIt={onMapIt} compact />
            <a href={placeHref(info.geoid)} className="mt-4 block text-sm font-medium text-primary underline-offset-2 hover:underline">Open the full place profile →</a>
          </>
        )}
      </BottomSheet>
    );
  }
  return (
    <section aria-label={`Details for ${info.name}`}
      className={`absolute right-[72px] ${panelTop(belowHeader)} z-30 w-80 overflow-y-auto rounded-lg border bg-popover p-3 shadow-md`}>
      {summary}
      {rows && (
        <a href={placeHref(info.geoid)}
          className="mt-3 flex items-center justify-between rounded text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          Full place profile: all datasets for {info.name.split(",")[0]} <span aria-hidden>→</span>
        </a>
      )}
    </section>
  );
}

/** Readable title: the signed route ("I-35", "US 52"), else the street name, else the road class. */
function featureTitle(h: FeatureHit, spec?: FeatureLayerSpec): string {
  const p = h.properties;
  if (p.tract && p.place) return `Tract ${Number(String(p.tract).slice(5)) / 100}, ${p.place}`;
  if (p.route) return String(p.route);
  if (p.street) return titleCase(String(p.street));
  const fs = Number(p.f_system);
  return F_SYSTEM[fs] ? `${F_SYSTEM[fs]} segment` : spec ? "Segment" : "Road segment";
}

/** Some states publish street names in capitals; show them in title case. */
function titleCase(s: string) {
  return s === s.toUpperCase() ? s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()) : s;
}

/** Popup rows: registry field labels and units; categorical codes shown with their facet labels. */
function featureRows(spec: FeatureLayerSpec, h: FeatureHit, facets: Facet[] = []): PopupRow[] {
  const rows: PopupRow[] = [];
  for (const [field, f] of Object.entries(spec.fields)) {
    const { label, unit } = typeof f === "string" ? { label: f, unit: undefined } : f;
    const v = h.properties[field];
    if (v == null || v === "") continue;
    if (field === "route" || field === "place") continue; // part of the title
    if (field === "street" && !h.properties.route) continue; // already the title
    const facet = facets.find((x) => x.field === field);
    const facetLabel = facet?.values.find((x) => String(x.value) === String(v))?.label;
    if (facetLabel) rows.push({ label, value: null, unit: "count", text: facetLabel });
    else if (typeof v === "string" && isNaN(Number(v))) rows.push({ label, value: null, unit: "count", text: titleCase(v) });
    else rows.push({ label, value: Number(v), unit: (unit ?? "count") as PopupRow["unit"] });
  }
  // Lead with the mapped value.
  const main = typeof spec.fields[spec.valueField] === "string" ? spec.fields[spec.valueField] as string : (spec.fields[spec.valueField] as { label: string })?.label;
  return rows.sort((a, b) => (b.label === main ? 1 : 0) - (a.label === main ? 1 : 0));
}

/** One facet as toggle chips with its plain-language explainer behind an info button. */
function FacetFilter({ facet, hidden, onToggle, onAll, docked }: { facet: Facet; hidden?: Set<string>; onToggle: (v: string) => void; onAll: () => void; docked?: boolean }) {
  const [explain, setExplain] = useState(false);
  const term = facet.term ? TERM_BY_ID.get(facet.term) : undefined;
  return (
    <fieldset>
      <div className="mb-1.5 flex items-center gap-1.5">
        <legend className={`text-xs font-semibold ${docked ? "wg-on-map" : ""}`}>{facet.label}</legend>
        <button type="button" onClick={() => setExplain((e) => !e)} aria-expanded={explain} aria-label={`What is ${facet.label.toLowerCase()}?`}
          className="rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-3.5" aria-hidden /></button>
        {hidden && hidden.size > 0 && <button type="button" onClick={onAll} className={`ml-auto rounded text-[11px] font-semibold text-primary hover:underline ${docked ? "wg-on-map" : ""}`}>Show all</button>}
      </div>
      {explain && (
        <div className={`mb-2 rounded-md p-2 text-[11px] leading-snug ${docked ? "wg-glass" : "bg-muted"}`}>
          <p>{facet.explainer}</p>
          {term && <p className="mt-1 text-muted-foreground">{term.short}</p>}
          <dl className="mt-1.5 space-y-0.5">
            {facet.values.filter((v) => v.description).map((v) => (
              <div key={String(v.value)}><dt className="inline font-semibold">{v.label}: </dt><dd className="inline">{v.description}</dd></div>
            ))}
          </dl>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {facet.values.map((v) => {
          const on = !hidden?.has(String(v.value));
          return (
            <button key={String(v.value)} type="button" aria-pressed={on} onClick={() => onToggle(String(v.value))}
              className={`rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground line-through aria-pressed:border-primary aria-pressed:text-foreground aria-pressed:no-underline focus-visible:outline-2 focus-visible:outline-ring ${docked ? "wg-glass border-transparent" : ""}`}>
              {v.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function FeaturePanel({ hit, spec, facets, onClose, belowHeader }: { hit: FeatureHit; spec: FeatureLayerSpec; facets: Facet[]; onClose: () => void; belowHeader: boolean }) {
  const phone = useIsPhone();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const body = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold leading-snug">{featureTitle(hit)}</h2>
        <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close details" className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <X className="size-4" />
        </button>
      </div>
      <Popup rows={featureRows(spec, hit, facets)} />
    </>
  );
  if (phone) return <BottomSheet label={`Details for ${featureTitle(hit)}`} summary={body} onClose={onClose}>{null}</BottomSheet>;
  return <section aria-label={`Details for ${featureTitle(hit)}`} className={`absolute right-[72px] ${panelTop(belowHeader)} z-30 w-72 overflow-y-auto rounded-lg border bg-popover p-3 shadow-md`}>{body}</section>;
}

