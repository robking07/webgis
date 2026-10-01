"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, CornerUpLeft, Info, Menu, Minus, Plus, SlidersHorizontal, X } from "lucide-react";
import { BivariateLegend, Legend, Popup, StatusState } from "@webgis/design/components";
import { featureLineColors, formatValue, GEO_LEVELS, LAZY_LEVELS, levelAtZoom, levelBands, STATIC_ONLY_LEVELS, TILE_VALUE_LEVELS, type GeoLevel } from "@webgis/design";
import { DatasetBrowser } from "./DatasetBrowser";
import { DataTable } from "./DataTable";
import { DatasetHeading } from "./DatasetMenus";
import { MapCredits } from "./MapCredits";
import { SearchOverlay } from "./SearchOverlay";
import { useScaleUnit } from "./SettingsMenu";
import { HeaderContent } from "./SiteHeader";
import { LogoMark } from "./Logo";
import { LANDING } from "@/lib/landing";
import { readStoredTheme, useResolvedTheme } from "@/lib/theme";
import { TERM_BY_ID } from "@/lib/glossary";
import type { Facet } from "@webgis/registry";
import { MapView, type Camera, type FeatureHit, type HoverInfo, type LevelPaint, type MapApi, type Padding } from "./map/MapView";
import { DATASET_BY_ID, DATASETS, type Dataset } from "@/lib/registry";
import { placeHref, rankText } from "@/lib/place";
import { F_SYSTEM, featureLayerSpec, isFeatureDataset, type FeatureField, type FeatureLayerSpec } from "@/lib/layers";
import { learnMoreLinks, type Link } from "@/lib/learn-more";
import { loadPlaceIndex, placeByGeoid, zoomForArea, type PlaceHit } from "@/lib/search";
import type { PopupRow } from "@webgis/design/components";
import { BottomSheet, useIsNarrow, useIsPhone } from "./BottomSheet";
import { PlaceDataList, type Detail } from "./PlaceDataList";
import { parseUrlState, useUrlState, type UrlState } from "@/lib/url-state";
import { classifyBivariate, classifyUnivariate, loadMoes, useDatasetValues, type Values } from "@/lib/values";
import { stopNote, stopsFor } from "@/lib/periods";
import { TimeControl } from "./TimeControl";
import { fetchDetail } from "@/lib/supabase";

const LEVELS = Object.keys(GEO_LEVELS) as GeoLevel[];
const HEADER_GAP = 68; // header (56) + 12

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
  const [scaleUnit, setScaleUnit] = useScaleUnit();
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [selected, setSelected] = useState<HoverInfo | null>(null);
  const [featureHover, setFeatureHover] = useState<FeatureHit | null>(null);
  const [featureSelected, setFeatureSelected] = useState<FeatureHit | null>(null);
  const [tilesError, setTilesError] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [immersed, setImmersed] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  /** Immersed: the display options dock (level + filters) under the heading. */
  const [dockOpen, setDockOpen] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  /** Feature-layer facet filters: field → values HIDDEN by the user. */
  const [hidden, setHidden] = useState<Record<string, Set<string>>>({});
  const [peek, setPeek] = useState(false);
  const mapApi = useRef<MapApi | null>(null);
  const root = useRef<HTMLDivElement>(null);
  // The dataset card's height, so phone controls can sit just below it.
  const card = useRef<HTMLElement>(null);
  const [cardH, setCardH] = useState(0);
  useEffect(() => {
    const el = card.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCardH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.d]);
  /** Views to return to: pushed only when a click on the map zooms to a feature (D-35). */
  const history = useRef<Camera[]>([]);
  const [canGoBack, setCanGoBack] = useState(false);
  const phone = useIsPhone();
  const narrow = useIsNarrow();

  // Esc brings the chrome back (panels and menus handle their own Esc first).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setImmersed(false); setPeek(false); setBrowserOpen(false); }
      // "/" opens search, unless the user is typing somewhere.
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const primary = state.d ? DATASET_BY_ID.get(state.d)! : null;
  // Feature layers (roads, transit…) draw their own geometry: no choropleth, no comparison.
  const isFeature = isFeatureDataset(primary);
  const featureSpec = useMemo(() => (primary && isFeature ? featureLayerSpec(primary) : null), [primary, isFeature]);
  const secondary = state.b && !isFeature && !isFeatureDataset(DATASET_BY_ID.get(state.b)) ? DATASET_BY_ID.get(state.b)! : null;
  // Year control (D-36): single-dataset maps only; comparisons use the default period.
  const stops = useMemo(() => (secondary || isFeature ? [] : stopsFor(primary)), [primary, secondary, isFeature]);
  const stop = stops.find((s) => s.id === state.t) ?? stops.find((s) => s.isDefault) ?? null;
  /** The shown stop when it isn't the default; null = the default period. */
  const stopId = stop && !stop.isDefault ? stop.id : null;
  // Levels both datasets have (and the shown stop has). Blocks (values in the tiles) can't be
  // compared: no bivariate join.
  const availableLevels = useMemo(() => isFeature ? [] : LEVELS.filter((l) => (!primary || primary.geographyLevels.includes(l)) && (!secondary || (secondary.geographyLevels.includes(l) && !TILE_VALUE_LEVELS.has(l))) && (!stopId || stop!.levels.includes(l))), [primary, secondary, isFeature, stopId, stop]);
  // Default level: how the source publishes the data, i.e. its finest level (ACS → tracts),
  // drawn at every zoom (D-35). "Switch with zoom" (lv=auto) restores the old zoom bands.
  const defaultLevel = primary?.defaultLevel && availableLevels.includes(primary.defaultLevel) ? primary.defaultLevel : availableLevels[availableLevels.length - 1] ?? null;
  const pinnedLevel = state.lv === "auto" ? null : state.lv && availableLevels.includes(state.lv) ? state.lv : defaultLevel;
  const bands = useMemo(() => (pinnedLevel ? { [pinnedLevel]: { minzoom: 0, maxzoom: 24 } } : levelBands(availableLevels)), [availableLevels, pinnedLevel]);
  // Start loading tract / block-group values a little before they appear.
  const nearBlocks = !!bands.block && state.at.zoom >= bands.block.minzoom - 1;
  const want = LEVELS.filter((l) => LAZY_LEVELS.has(l) && ((!!bands[l] && state.at.zoom >= bands[l]!.minzoom - 1) || (l === "block_group" && nearBlocks)));
  // Blocks are colored from their tile property with the block-group classes, so the legend holds.
  const blockField = primary?.measure.kind === "census2020" ? primary.measure.value : null;
  const x = useDatasetValues(primary, want, stopId, stop?.levels);
  const y = useDatasetValues(secondary, want);
  // A non-default stop is colored with the default view's breaks, so stepping shows change.
  const xBase = useDatasetValues(stopId ? primary : null, want);
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
      } else if (stopId) {
        if (xBase.values[l]) out[l] = classifyUnivariate(primary, xv, xBase.values[l]);
      } else {
        out[l] = classifyUnivariate(primary, xv);
      }
    }
    const bg = out.block_group;
    if (blockField && !secondary && bg?.breaks) out.block = { colors: bg.colors, breaks: bg.breaks, classes: new Map(), field: blockField };
    return out;
  }, [primary, secondary, x.values, y.values, stopId, xBase.values, blockField]);

  const current = classed[level];
  const error = x.error ?? y.error;
  const available = !!primary && !isFeature && availableLevels.includes(level);
  // The table lists states or counties (finer areas have no names to search); below counties it shows counties.
  const tableLevel: GeoLevel | null = level === "state" || level === "county" ? level : availableLevels.includes("county") ? "county" : null;
  // Clear selections and filters when the dataset changes.
  useEffect(() => { setSelected(null); setFeatureSelected(null); setFeatureHover(null); setHidden({}); mapApi.current?.select("county", null); }, [state.d]);
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
  const filtersActive = Object.values(hidden).some((h) => h.size > 0);

  // ── Framing (D-35) ─────────────────────────────────────────────────────────────
  /** Map padding that keeps a target clear of whatever is open: every element marked
   *  `data-obstructs` claims the screen edge it covers least. `detail` reserves room for a
   *  details panel that is about to open. */
  const clearArea = useCallback((detail?: boolean): Padding | undefined => {
    const el = root.current;
    if (!el) return undefined;
    const W = el.clientWidth, H = el.clientHeight;
    const p: Padding = { top: 24, right: 24, bottom: 32, left: 24 };
    el.querySelectorAll<HTMLElement>("[data-obstructs]").forEach((n) => {
      const r = n.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const sides: Array<[keyof Padding, number]> = [["left", r.right], ["right", W - r.left], ["top", r.bottom], ["bottom", H - r.top]];
      const [side, v] = sides.reduce((a, b) => (b[1] < a[1] ? b : a));
      p[side] = Math.max(p[side], v + 16);
    });
    if (detail) {
      if (W < 768) p.bottom = Math.max(p.bottom, Math.min(H * 0.45, 260) + 16);
      else p.right = Math.max(p.right, 72 + 320 + 16);
    }
    return p;
  }, []);
  const remember = () => {
    const api = mapApi.current;
    if (!api) return;
    history.current.push(api.getCamera());
    setCanGoBack(true);
  };
  const goBack = () => {
    const c = history.current.pop();
    if (c) mapApi.current?.setCamera(c);
    setCanGoBack(history.current.length > 0);
    setSelected(null); setFeatureSelected(null);
    mapApi.current?.select("county", null);
  };
  /** A click on the map: select it and zoom to its extent, with a way back. */
  const onMapSelect = useCallback((h: HoverInfo | null) => {
    setSelected(h);
    const api = mapApi.current;
    if (!h || !api) return;
    const before = api.getCamera();
    if (api.fitGeography(h.level, h.geoid, clearArea(true))) { history.current.push(before); setCanGoBack(true); }
  }, [clearArea]);
  const onFeatureSelect = useCallback((hit: FeatureHit | null) => {
    setFeatureSelected(hit);
    const api = mapApi.current;
    if (!hit?.bbox || !api) return;
    history.current.push(api.getCamera());
    setCanGoBack(true);
    api.fitBbox(hit.bbox, clearArea(true), 14);
  }, [clearArea]);

  /** Fly to a place from the table or search, framed clear of open panels, and select it. */
  const goToPlace = useCallback((p: { geoid: string | null; level: GeoLevel | null; name: string; lon: number; lat: number; sqmi?: number }) => {
    const selectable = !!p.geoid && !!p.level && !isFeature && !!primary?.geographyLevels.includes(p.level);
    // Wait a frame so panels that just opened/closed are measured where they now are.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const pad = clearArea(selectable && !(tableOpen && narrow));
      const el = root.current;
      // Fit to the free part of the map (between panels), not the whole screen.
      const free = el && pad ? Math.min(el.clientWidth - pad.left - pad.right, el.clientHeight - pad.top - pad.bottom) : 1000;
      const zoom = p.sqmi != null ? zoomForArea(p.sqmi, free) : p.level === "state" ? 5.2 : 8.2;
      mapApi.current?.flyTo(p.lon, p.lat, zoom, pad);
    }));
    if (selectable) {
      mapApi.current?.select(p.level!, p.geoid!);
      setSelected({ geoid: p.geoid!, name: p.name, level: p.level!, x: 0, y: 0, lon: p.lon, lat: p.lat });
    }
  }, [clearArea, isFeature, primary, tableOpen, narrow]);
  const onTableClose = useCallback(() => setTableOpen(false), []);
  const onTablePick = useCallback((geoid: string, name: string, lon: number, lat: number) => {
    if (!tableLevel) return;
    loadPlaceIndex().then((rows) => placeByGeoid(rows, geoid)?.sqmi, () => undefined)
      .then((sqmi) => goToPlace({ geoid, level: tableLevel, name, lon, lat, sqmi }));
  }, [tableLevel, goToPlace]);
  const onSearchPlace = (p: PlaceHit) => { setSearchOpen(false); goToPlace(p); };
  /** Keep the shown year when the next dataset has it too. */
  const keepStop = (id: string) => (state.t && stopsFor(DATASET_BY_ID.get(id) ?? null).some((s) => s.id === state.t) ? state.t : null);
  const onSearchDataset = (d: Dataset) => { setSearchOpen(false); update({ d: d.id, b: state.b === d.id ? null : state.b, lv: null, t: keepStop(d.id) }); };
  const pickDataset = (id: string) => update({ d: id, b: state.b === id ? null : state.b, lv: null, t: keepStop(id) });
  const loading = available && !current && !error;

  // ── Map-first chrome (D-25) ─────────────────────────────────────────────────
  // At rest: slim header, dataset card, full legend. The first user pan/zoom/scroll
  // "immerses": the navigation falls away, leaving the wordmark, the category and dataset
  // heading (with menus), and the legend. The menu button, the top edge, or Esc brings it back.
  // Line layers reverse their ramp on dark land (see featureLineColors); the legend follows the map.
  const featureColors = featureSpec && (featureSpec.geometry === "line" ? featureLineColors(featureSpec.colors, theme) : featureSpec.colors);
  const legendStrip = primary && (featureColors || current?.colors);
  const legendEnds = featureSpec
    ? [`< ${formatValue(featureSpec.breaks[0], primary!.unit)}`, `≥ ${formatValue(featureSpec.breaks[featureSpec.breaks.length - 1], primary!.unit)}`]
    : current?.breaks?.length ? [`< ${formatValue(current.breaks[0], primary!.unit)}`, `≥ ${formatValue(current.breaks[current.breaks.length - 1], primary!.unit)}`] : null;
  const chromeShown = !immersed || peek;
  // Popups sit under the header while it's showing and move back up when it falls away.
  const panelTop = chromeShown ? HEADER_GAP : 12;
  // Legend: desktop shows it in full; it shrinks to its strip only while Display options needs the room.
  const desktopStrip = optionsOpen && !immersed;
  const hasOptions = !!primary && (availableLevels.length > 1 || primary.facets.length > 0);
  const featureNoun = featureSpec?.geometry === "polygon" ? "Census tracts (2010)" : "Road segments";
  const periodLabel = primary ? (stopId ? stop!.label : primary.vintage) : "";
  const meta = primary ? [isFeature ? featureNoun : GEO_LEVELS[level].label, periodLabel, primary.source.name.split(",")[0].split(" (")[0]].join(" · ") : "";
  const levelNote = pinnedLevel
    ? `Showing ${GEO_LEVELS[pinnedLevel].label.toLowerCase()}s at every zoom${pinnedLevel === defaultLevel ? ", how the source publishes this data" : ""}.`
    : "Switches to smaller areas as you zoom in.";
  const displayOptions = (docked: boolean) => (
    <>
      {availableLevels.length > 1 && (
        <LevelPicker levels={availableLevels} pinned={pinnedLevel} defaultLevel={defaultLevel} note={levelNote} docked={docked}
          onChange={(l) => update({ lv: l === defaultLevel ? null : l })} />
      )}
      {primary?.facets.map((f) => (
        <FacetFilter key={f.field} facet={f} hidden={hidden[f.field]} docked={docked} onToggle={(v) => toggleFacet(f.field, v)}
          onAll={() => setHidden((cur) => ({ ...cur, [f.field]: new Set() }))} />
      ))}
    </>
  );
  const timeControl = stops.length > 0 && stop && (
    <TimeControl stops={stops} value={stop.id} onChange={(id) => update({ t: stops.find((s) => s.id === id)?.isDefault ? null : id })} />
  );
  const legendBody = (
    <>
      {timeControl && <div className="mb-3 border-b pb-3">{timeControl}</div>}
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
            caption={`${GEO_LEVELS[level].label} · ${periodLabel}${stop && stopNote(primary, stop, level) ? `. ${stopNote(primary, stop, level)}` : ""}${primary.coverageNote ? `. ${primary.coverageNote}` : ""}`} />
        ) : null}
    </>
  );
  const tableReady = !!primary && !isFeature && !!tableLevel && !!x.values[tableLevel];
  const dockShown = !!primary && immersed && hasOptions && (dockOpen || filtersActive);
  // Narrow screens dock the table at the bottom; the details panel waits until it closes.
  const detailHidden = tableOpen && narrow;

  return (
    <div ref={root} className="fixed inset-0 overflow-hidden"
      onMouseMove={(e) => { if (immersed && !peek && e.clientY < 14) setPeek(true); }}>
      <button type="button" onClick={() => setBrowserOpen(true)}
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:shadow">Choose a dataset</button>

      <main className="absolute inset-0">
        <MapView
          theme={theme}
          initialView={initial.at}
          paint={classed}
          boundaries={stopId ? stop!.boundaries ?? null : null}
          onViewChange={(at) => update({ at })}
          onHover={setHover}
          onSelect={onMapSelect}
          onTilesError={setTilesError}
          levelZooms={bands}
          featureLayer={featureSpec}
          featureFilter={featureFilter}
          onFeatureHover={setFeatureHover}
          onFeatureSelect={onFeatureSelect}
          onUserMove={() => { if (!browserOpen) { setImmersed(true); setPeek(false); if (filtersActive) setDockOpen(true); } }}
          onApi={(api) => { mapApi.current = api; }}
          scaleUnit={scaleUnit}
          attribution={false}
          ariaLabel={primary ? `Map of ${primary.title}${secondary ? ` compared with ${secondary.title}` : ""} by ${GEO_LEVELS[level].label.toLowerCase()}` : "Map"}
        />
      </main>

      {/* Header: falls away entirely when immersed; peeks back at the top edge. */}
      <header onMouseLeave={() => setPeek(false)} data-obstructs={chromeShown ? "" : undefined}
        className={`absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur transition-transform duration-300 ease-out md:px-6 ${chromeShown ? "translate-y-0" : "-translate-y-full"}`}
        aria-hidden={!chromeShown || undefined} inert={!chromeShown || undefined}>
        <HeaderContent current="map" onSearch={() => setSearchOpen(true)} explicitTheme={state.theme} onTheme={(t) => update({ theme: t })}
          unit={scaleUnit} onUnit={setScaleUnit} />
      </header>

      {/* At rest: the factual dataset card. */}
      {primary && (
        <section ref={card} aria-label="Mapped dataset" data-obstructs={!immersed ? "" : undefined}
          className={`absolute left-3 right-3 top-[68px] z-20 rounded-lg border bg-card p-3 shadow-sm transition-all duration-300 md:left-4 md:right-auto md:w-80 md:p-4 ${immersed ? "pointer-events-none -translate-y-3 opacity-0" : "opacity-100"}`}
          inert={immersed || undefined}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{primary.category}</span>
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
            {tableReady && <button type="button" onClick={() => setTableOpen(true)} className="rounded-md border px-2.5 py-1 text-[13px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Table</button>}
            <a href={`/data/${primary.id}`} className="rounded-md border px-2.5 py-1 text-[13px] text-foreground hover:bg-muted"><span className="md:hidden">About</span><span className="hidden md:inline">About this data</span></a>
            {/* Progressive disclosure: options stay tucked away until asked for. */}
            {hasOptions && (
              <button type="button" onClick={() => setOptionsOpen((o) => !o)} aria-expanded={optionsOpen} aria-controls="display-options"
                className="flex items-center gap-1.5 rounded px-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:mt-1 md:basis-full md:px-0">
                <SlidersHorizontal className="size-3.5" aria-hidden /> <span className="md:hidden">Options</span><span className="hidden md:inline">Display options</span> <ChevronDown className={`size-3.5 transition-transform ${optionsOpen ? "rotate-180" : ""}`} aria-hidden />
              </button>
            )}
          </div>
          {optionsOpen && (
            <div id="display-options" className="mt-2 max-h-[45vh] space-y-4 overflow-y-auto border-t pt-3">
              {displayOptions(false)}
            </div>
          )}
        </section>
      )}

      {/* Immersed: menu button and wordmark, then the category above the dataset name (both open menus),
          then the display options chip. */}
      {primary && (
        <div data-obstructs={immersed ? "" : undefined}
          className={`pointer-events-none absolute left-3 top-3 z-20 flex flex-col gap-1 transition-opacity duration-300 md:left-4 ${immersed ? "opacity-100" : "opacity-0"}`}
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
          <div className="mt-1">
            <DatasetHeading key={primary.id} primary={primary} secondary={secondary} onPick={pickDataset} />
          </div>
          {hasOptions && (
            <button type="button" onClick={() => setDockOpen((o) => !(o || filtersActive))} aria-expanded={dockShown} aria-controls="display-dock"
              className="wg-glass pointer-events-auto mt-1 flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              <SlidersHorizontal className="size-3.5" aria-hidden />
              {isFeature ? (filtersActive ? "Filters on" : "Filters") : `${GEO_LEVELS[level].label}s`}
              <ChevronDown className={`size-3.5 transition-transform ${dockShown ? "rotate-180" : ""}`} aria-hidden />
            </button>
          )}
        </div>
      )}

      {/* Display dock (immersed): geography level and filters stay reachable after zooming in (D-28, D-35).
          Transparent, with text halos and glass chips. */}
      {dockShown && (
        <section id="display-dock" aria-label="Display options" data-obstructs=""
          className="wg-dock absolute left-3 z-20 max-h-[calc(100%-260px)] w-[min(18rem,calc(100%-1.5rem))] space-y-3 overflow-y-auto md:left-4"
          style={{ top: hasOptions ? 152 : 124 }}>
          {displayOptions(true)}
        </section>
      )}

      {/* Zoom: frosted pill (desktop; phones pinch-zoom). */}
      <div className={`wg-glass absolute right-3 z-20 hidden flex-col md:flex overflow-hidden rounded-[14px] transition-[top] duration-300 md:right-4 ${chromeShown && !immersed ? "top-[68px]" : "top-3"}`}>
        <button type="button" onClick={() => mapApi.current?.zoomIn()} aria-label="Zoom in" className="wg-zbtn grid size-11 place-items-center text-foreground"><Plus className="size-4" aria-hidden /></button>
        <span className="mx-2.5 h-px bg-foreground/15" aria-hidden />
        <button type="button" onClick={() => mapApi.current?.zoomOut()} aria-label="Zoom out" className="wg-zbtn grid size-11 place-items-center text-foreground"><Minus className="size-4" aria-hidden /></button>
      </div>

      {/* Back to the view before the last map click (only after a click has zoomed somewhere). */}
      {canGoBack && (
        <button type="button" onClick={goBack} aria-label="Back to the previous view" title="Back to the previous view"
          className="wg-glass wg-zbtn absolute right-3 z-20 grid size-11 place-items-center rounded-[14px] text-foreground transition-[top] duration-300 md:right-4"
          // Desktop: under the zoom pill. Phones (no zoom pill): top right, below the dataset card at rest.
          style={{ top: phone ? (chromeShown && !immersed ? HEADER_GAP + cardH + 8 : 12) : (chromeShown && !immersed ? 166 : 110) }}>
          <CornerUpLeft className="size-[18px]" aria-hidden />
        </button>
      )}

      {/* Legend: full card at rest on desktop; a strip when immersed or on phones (tap to expand). */}
      {legendStrip && legendEnds && !legendOpen && (
        <button type="button" onClick={() => setLegendOpen(true)} aria-expanded={false} aria-label={`Show legend for ${primary!.title}`}
          className={`wg-glass wg-glass-strong absolute bottom-6 left-3 z-20 max-w-[calc(100%-9rem)] items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs tabular-nums text-foreground focus-visible:outline-2 focus-visible:outline-ring md:left-4 md:max-w-none ${desktopStrip ? "flex" : "flex md:hidden"}`}>
          {/* The strip is a compact key: numbers only ("< 2.5K", "≥ 75K"); the unit is in the full legend. */}
          {stopId && <span className="font-semibold">{stop!.label}</span>}
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
        {tableReady && (
          <button type="button" onClick={() => setTableOpen(true)}
            className="mt-2 rounded text-xs text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            View as table{tableLevel !== level ? " (counties)" : ""}
          </button>
        )}
      </section>

      <MapCredits datasets={[primary, secondary].filter((d): d is Dataset => !!d)} />

      {/* Dataset browser (Change dataset / Compare): overlay panel (desktop) / sheet (phone). */}
      {browserOpen && (
        <section aria-label="Datasets" role="dialog" aria-modal="true"
          className="absolute inset-x-0 bottom-0 top-16 z-40 flex flex-col gap-3 rounded-t-2xl border bg-background p-4 shadow-xl md:inset-y-3 md:left-3 md:right-auto md:top-3 md:w-[380px] md:rounded-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Datasets</h2>
            <button type="button" onClick={() => setBrowserOpen(false)} aria-label="Close datasets" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" /></button>
          </div>
          <DatasetBrowser primary={state.d} secondary={state.b}
            onPrimary={(id) => { pickDataset(id); setBrowserOpen(false); }}
            onSecondary={(id) => { update({ b: id, t: null }); setBrowserOpen(false); }} />
          <a href="/data" className="text-xs text-primary hover:underline">Browse the full data directory →</a>
        </section>
      )}

      {searchOpen && <SearchOverlay current={state.d} onClose={() => setSearchOpen(false)} onPlace={onSearchPlace} onDataset={onSearchDataset} />}

      {tableOpen && primary && tableLevel && (
        <DataTable level={tableLevel} x={primary} xv={x.values[tableLevel]} y={secondary} yv={y.values[tableLevel]} period={stopId ? stop!.label : undefined} selected={selected?.geoid ?? null}
          onClose={onTableClose} onPick={onTablePick} />
      )}

      {tilesError && (
        <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-lg border bg-card p-1 shadow-sm">
          <StatusState status="error" message="Boundary tiles aren't available yet." />
        </div>
      )}

      {hover && !selected && primary && (
        <div className="pointer-events-none absolute z-30 rounded-md border bg-popover p-2.5 shadow-md" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <Popup title={hover.name} subtitle={`${GEO_LEVELS[hover.level].label}${stopId ? ` · ${stop!.label}` : ""}`}
            rows={[primary, secondary].filter((d) => !!d).map((d) => ({
              label: d!.title, unit: d!.unit,
              value: TILE_VALUE_LEVELS.has(hover.level) && blockField ? (hover.props?.[blockField] as number | undefined) : (d === primary ? x : y).values[hover.level]?.[hover.geoid],
            }))} />
        </div>
      )}
      {featureHover && !featureSelected && featureSpec && (
        <div className="pointer-events-none absolute z-30 rounded-md border bg-popover p-2.5 shadow-md" style={{ left: featureHover.x + 14, top: featureHover.y + 14 }}>
          <Popup title={featureTitle(featureHover, featureSpec)} rows={featureRows(featureSpec, featureHover, primary?.facets).slice(0, 2)} />
        </div>
      )}
      {featureSelected && featureSpec && primary && (
        <FeaturePanel hit={featureSelected} spec={featureSpec} dataset={primary} top={panelTop}
          onClose={() => setFeatureSelected(null)} />
      )}
      {selected && primary && !isFeature && !detailHidden && (
        <DetailPanel info={selected} top={panelTop} onClose={() => { setSelected(null); mapApi.current?.select("county", null); }} primary={primary} secondary={secondary}
          xv={x.values[selected.level]} yv={y.values[selected.level]}
          period={stopId ? { label: stop!.label, defaultLabel: primary.vintage } : undefined}
          onMapIt={pickDataset} />
      )}
    </div>
  );
}

interface DetailProps {
  info: HoverInfo;
  /** Distance from the top: below the header while it shows (desktop panel only). */
  top: number;
  onClose: () => void;
  primary: Dataset;
  secondary: Dataset | null;
  /** Loaded values at the clicked feature's level, for the rank line. */
  xv?: Values;
  yv?: Values;
  /** Switch the map to another dataset (from the drawer's full list). */
  onMapIt: (id: string) => void;
  /** A timeline stop is shown (D-36): the primary value comes from `xv` for that period. */
  period?: { label: string; defaultLabel: string };
}

function DetailPanel({ info, top, onClose, primary, secondary, xv, yv, onMapIt, period }: DetailProps) {
  const [rows, setRows] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const phone = useIsPhone();
  // Block groups aren't in the database (D-39): the mapped values come from the static files,
  // margins of error from their side files; there's no all-datasets list or place profile.
  const staticOnly = STATIC_ONLY_LEVELS.has(info.level);
  useEffect(() => {
    let live = true;
    setRows(null); setErr(null);
    const load = staticOnly
      ? Promise.all([primary, secondary].filter((d): d is Dataset => !!d).map(async (d, i) => {
          const moes = TILE_VALUE_LEVELS.has(info.level) ? ({} as Values) : await loadMoes(d.id, info.level).catch(() => ({} as Values));
          // Blocks: the value is in the tile; 2020 Census counts have no margin of error.
          const fromTile = TILE_VALUE_LEVELS.has(info.level) && d.measure.kind === "census2020" ? (info.props?.[d.measure.value] as number | undefined) : undefined;
          return [d.id, { value: fromTile ?? (i === 0 ? xv : yv)?.[info.geoid] ?? null, moe: moes[info.geoid] ?? null }] as const;
        })).then((e) => Object.fromEntries(e) as Detail)
      : fetchDetail(info.geoid);
    load.then((r) => live && setRows(r), (e) => live && setErr(String(e.message ?? e)));
    return () => { live = false; };
  }, [info.geoid, info.level, staticOnly, primary, secondary, xv, yv]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const featured = [primary, secondary].filter((d): d is Dataset => !!d);
  const links = dedupe(featured.flatMap((d) => learnMoreLinks(d, { level: info.level, geoid: info.geoid, lon: info.lon, lat: info.lat })));
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
              if (i === 0 && period) {
                const v = xv?.[info.geoid];
                return (
                  <div key={d.id} className="rounded-md bg-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">{d.title}, {period.label}</p>
                    <p className="text-xl font-semibold tabular-nums">{formatValue(v, d.unit)}</p>
                    {rankText(xv, v, info.level) && <p className="text-xs text-muted-foreground">{rankText(xv, v, info.level)}</p>}
                    {r?.value != null && <p className="mt-1 text-xs text-muted-foreground">{period.defaultLabel}: <span className="tabular-nums">{formatValue(r.value, d.unit)}</span></p>}
                  </div>
                );
              }
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
      <LearnMore links={links} />
      {phone && rows && !staticOnly && <p className="mt-2 text-center text-xs text-muted-foreground group-data-[snap=full]:hidden">Swipe up for all {Object.keys(rows).length} datasets here</p>}
    </>
  );

  if (phone) {
    return (
      <BottomSheet label={`Details for ${info.name}`} summary={summary} onClose={onClose}>
        {rows && !staticOnly && (
          <>
            <PlaceDataList level={info.level} detail={rows} onMapIt={onMapIt} compact />
            <a href={placeHref(info.geoid)} className="mt-4 block text-sm font-medium text-primary underline-offset-2 hover:underline">Open the full place profile →</a>
          </>
        )}
      </BottomSheet>
    );
  }
  return (
    <section aria-label={`Details for ${info.name}`} data-obstructs=""
      className="absolute right-[72px] z-30 w-80 overflow-y-auto rounded-lg border bg-popover p-3 shadow-md transition-[top] duration-300"
      style={{ top, maxHeight: `calc(100% - ${top + 12}px)` }}>
      {summary}
      {rows && !staticOnly && (
        <a href={placeHref(info.geoid)}
          className="mt-3 flex items-center justify-between rounded text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          Full place profile: all datasets for {info.name.split(",")[0]} <span aria-hidden>→</span>
        </a>
      )}
    </section>
  );
}

/** "< 2.5K vehicles/day" → "< 2.5K": the legend strip keeps the comparison and number, drops unit words. */
const stripEnd = (s: string) => s.replace(/^([<≥]\s*\S+).*$/, "$1");

const dedupe = (links: Link[]) => links.filter((l, i) => links.findIndex((m) => m.url === l.url) === i);

/** Readable resources about this place or feature (not the metadata). */
function LearnMore({ links }: { links: Link[] }) {
  if (!links.length) return null;
  return (
    <div className="mt-3 border-t pt-2">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Learn more</p>
      <ul className="space-y-1">
        {links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noopener" className="inline-flex items-start gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline">
              {l.label} <ArrowUpRight className="mt-px size-3 shrink-0" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
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

const fieldSpec = (f: FeatureField | string): FeatureField => (typeof f === "string" ? { label: f } : f);

/** Popup rows: registry field labels and units; categorical codes shown with their facet labels.
 *  `skipLists` leaves out list fields with per-item explainers (the panel shows them in full). */
function featureRows(spec: FeatureLayerSpec, h: FeatureHit, facets: Facet[] = [], skipLists = false): PopupRow[] {
  const rows: PopupRow[] = [];
  for (const [field, f] of Object.entries(spec.fields)) {
    const { label, unit, items } = fieldSpec(f);
    const v = h.properties[field];
    if (v == null || v === "") continue;
    if (field === "route" || field === "place") continue; // part of the title
    if (field === "street" && !h.properties.route) continue; // already the title
    if (skipLists && items) continue;
    const facet = facets.find((x) => x.field === field);
    const facetLabel = facet?.values.find((x) => String(x.value) === String(v))?.label;
    if (facetLabel) rows.push({ label, value: null, unit: "count", text: facetLabel });
    else if (typeof v === "string" && isNaN(Number(v))) rows.push({ label, value: null, unit: "count", text: titleCase(v) });
    else rows.push({ label, value: Number(v), unit: (unit ?? "count") as PopupRow["unit"] });
  }
  // Lead with the mapped value.
  const main = fieldSpec(spec.fields[spec.valueField] ?? "").label;
  return rows.sort((a, b) => (b.label === main ? 1 : 0) - (a.label === main ? 1 : 0));
}

/** List fields (e.g. CEJST burdens) item by item, each with its explainer and source link. */
function ExplainedLists({ spec, hit }: { spec: FeatureLayerSpec; hit: FeatureHit }) {
  const lists = Object.entries(spec.fields).map(([k, f]) => [k, fieldSpec(f)] as const)
    .filter(([k, f]) => f.items && hit.properties[k]);
  const notes = Object.entries(spec.fields).map(([k, f]) => [k, fieldSpec(f)] as const)
    .filter(([k, f]) => !f.items && f.explainer && hit.properties[k] != null);
  if (!lists.length && !notes.length) return null;
  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      {lists.map(([k, f]) => (
        <section key={k} aria-label={f.label}>
          <h3 className="text-xs font-semibold">{f.label}</h3>
          {f.explainer && <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{f.explainer}</p>}
          <ul className="mt-1.5 space-y-1.5">
            {String(hit.properties[k]).split(", ").map((item) => {
              const it = f.items?.[item];
              return (
                <li key={item} className="text-[12px] leading-snug">
                  {it?.url ? <a href={it.url} target="_blank" rel="noopener" className="font-semibold text-primary underline-offset-2 hover:underline">{item}</a> : <span className="font-semibold">{item}</span>}
                  {it?.description && <span className="text-muted-foreground"> — {it.description}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {notes.length > 0 && (
        <dl className="space-y-1.5 text-[11.5px] leading-snug">
          {notes.map(([k, f]) => (
            <div key={k}>
              <dt className="inline font-semibold">{f.label}: </dt>
              <dd className="inline text-muted-foreground">{f.explainer}{f.url && <> <a href={f.url} target="_blank" rel="noopener" className="text-primary hover:underline">More</a></>}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Geography level: the dataset's own level by default, any other level at every zoom, or switch with zoom. */
function LevelPicker({ levels, pinned, defaultLevel, note, docked, onChange }: {
  levels: GeoLevel[]; pinned: GeoLevel | null; defaultLevel: GeoLevel | null; note: string; docked?: boolean; onChange: (l: GeoLevel | "auto") => void;
}) {
  return (
    <fieldset>
      <legend className={`mb-1.5 text-xs font-semibold ${docked ? "wg-on-map" : ""}`}>Geography level</legend>
      <div role="radiogroup" aria-label="Geography level" className="flex flex-wrap gap-1.5">
        {([...levels, "auto"] as Array<GeoLevel | "auto">).map((l) => (
          <button key={l} type="button" role="radio" aria-checked={l === "auto" ? !pinned : pinned === l} onClick={() => onChange(l)}
            className={`rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground aria-checked:border-primary aria-checked:bg-primary aria-checked:text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring ${docked ? "wg-glass border-transparent text-foreground" : ""}`}>
            {l === "auto" ? "Switch with zoom" : GEO_LEVELS[l].label.replace("Census tract", "Tract")}{l === defaultLevel ? " (default)" : ""}
          </button>
        ))}
      </div>
      <p className={`mt-1.5 text-[11px] leading-snug text-muted-foreground ${docked ? "wg-on-map" : ""}`}>
        {note}
      </p>
    </fieldset>
  );
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

function FeaturePanel({ hit, spec, dataset, top, onClose }: { hit: FeatureHit; spec: FeatureLayerSpec; dataset: Dataset; top: number; onClose: () => void }) {
  const phone = useIsPhone();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const links = learnMoreLinks(dataset, { lon: hit.lon, lat: hit.lat, props: hit.properties });
  const head = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold leading-snug">{featureTitle(hit)}</h2>
        <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close details" className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <X className="size-4" />
        </button>
      </div>
      <Popup rows={featureRows(spec, hit, dataset.facets, true)} />
    </>
  );
  const more = (
    <>
      <ExplainedLists spec={spec} hit={hit} />
      <LearnMore links={links} />
    </>
  );
  if (phone) return <BottomSheet label={`Details for ${featureTitle(hit)}`} summary={head} onClose={onClose}>{more}</BottomSheet>;
  return (
    <section aria-label={`Details for ${featureTitle(hit)}`} data-obstructs=""
      className="absolute right-[72px] z-30 w-80 overflow-y-auto rounded-lg border bg-popover p-3 shadow-md transition-[top] duration-300"
      style={{ top, maxHeight: `calc(100% - ${top + 12}px)` }}>
      {head}{more}
    </section>
  );
}

