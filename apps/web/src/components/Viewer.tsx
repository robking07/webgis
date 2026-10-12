"use client";
// The map page. This file is the orchestrator: URL state, which panels are open, and how they
// connect. The pieces live in ./map-page (data and classification in useViewerData, zoom-to-click
// framing in useFraming, and one file per panel).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StatusState } from "@webgis/design/components";
import { formatValue, GEO_LEVELS, HATCH_LEVELS, isGradable, type GeoLevel } from "@webgis/design";
import { DataTable } from "./DataTable";
import { MapCredits } from "./MapCredits";
import { SearchOverlay } from "./SearchOverlay";
import { useScaleUnit } from "./SettingsMenu";
import { HeaderContent } from "./SiteHeader";
import { LANDING } from "@/lib/landing";
import { readStoredTheme, useResolvedTheme } from "@/lib/theme";
import { MapView, type FeatureHit, type HoverInfo, type MapApi } from "./map/MapView";
import { DATASET_BY_ID, DATASETS, type Dataset } from "@/lib/registry";
import { loadPlaceIndex, placeByGeoid, type PlaceHit } from "@/lib/search";
import { useIsCompact, useIsNarrow, useIsPhone } from "./BottomSheet";
import { DatasetSheet } from "./DatasetMenus";
import { parseUrlState, useUrlState, type UrlState } from "@/lib/url-state";
import { areaChangeNote, stopsFor } from "@/lib/periods";
import { useViewerData } from "./map-page/useViewerData";
import { useFraming } from "./map-page/useFraming";
import { HEADER_GAP } from "./map-page/layout";
import { DatasetCard } from "./map-page/DatasetCard";
import { ImmersedHeading } from "./map-page/ImmersedHeading";
import { filterCount, FiltersSheet, FiltersSidebar, pluralLabel, type FilterValue } from "./map-page/FiltersPanel";
import { useMapMotion } from "./map-page/useMapMotion";
import { MapControls } from "./map-page/MapControls";
import { MapLegend } from "./map-page/MapLegend";
import { DatasetsPanel } from "./map-page/DatasetsPanel";
import { FeatureHoverPopup, PlaceHoverPopup } from "./map-page/HoverPopups";
import { DetailPanel } from "./map-page/DetailPanel";
import { useUnreliable } from "./map-page/useUnreliable";
import { FeaturePanel } from "./map-page/FeaturePanel";
import { ContextLink, ContextPanel, CONTEXT_PANEL_RIGHT } from "./map-page/ContextPanel";
import { contextFor } from "@/lib/context";

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
  const [immersed, setImmersed] = useState(false);
  /** The filters panel (issue #34): a sidebar on desktop, a full-screen sheet on phones. `anchor`
   *  is the filter button it grows from and shrinks back into. */
  const [filters, setFilters] = useState<{ anchor: HTMLElement | null } | null>(null);
  /** Immersed: the category or dataset menu is open. */
  const [headingMenu, setHeadingMenu] = useState(false);
  /** Feature-layer facet filters: field → values HIDDEN by the user. */
  const [hidden, setHidden] = useState<Record<string, Set<string>>>({});
  const [peek, setPeek] = useState(false);
  /** "Why this matters" is open (issue #115). `?context=preview` also shows unapproved drafts; production
   *  builds don't contain any (scripts/prepare.mts), so the switch does nothing on mapwich.org. */
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPreview] = useState(() => new URLSearchParams(search).get("context") === "preview");
  const mapApi = useRef<MapApi | null>(null);
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
  const phone = useIsPhone();
  const narrow = useIsNarrow();
  const compact = useIsCompact();
  /** Phones: the dataset list is open as a bottom sheet (issue #34). */
  const [listOpen, setListOpen] = useState(false);
  /** Bumped to close an open dataset drop-down when the map starts moving. */
  const [closeKey, setCloseKey] = useState(0);
  // "The map wins while it moves" (issue #34): on smaller screens a pan, pinch or scroll closes
  // menus and sets the filters sidebar aside until the map settles; larger monitors keep the
  // sidebar and legend, and only an open dataset list closes.
  const { moving, start: startMotion } = useMapMotion(mapApi);
  const stepAside = moving && compact;

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

  /** Counties whose tracts are on screen, while hatching or a change map's margin test needs them. */
  const [tractCounties, setTractCounties] = useState<string[]>([]);
  const { primary, secondary, isFeature, featureSpec, stops, stop, stopId, since, xFrom, testMoes, availableLevels, pinnedLevel, bands, x, y, level, classed, blockField } = useViewerData(state, tractCounties);
  const current = classed[level];
  const error = x.error ?? y.error ?? xFrom.error;
  const available = !!primary && !isFeature && availableLevels.includes(level);
  // The table lists states or counties (finer areas have no names to search); below counties it shows counties.
  const tableLevel: GeoLevel | null = level === "state" || level === "county" ? level : availableLevels.includes("county") ? "county" : null;
  // Clear selections and filters when the dataset changes.
  const [seenDataset, setSeenDataset] = useState(state.d);
  if (seenDataset !== state.d) { setSeenDataset(state.d); setSelected(null); setFeatureSelected(null); setFeatureHover(null); setHidden({}); setCtxOpen(false); }
  useEffect(() => { mapApi.current?.select("county", null); }, [state.d]);
  const featureFilter = useMemo(() => {
    if (!primary) return undefined;
    const out: Record<string, Array<string | number>> = {};
    for (const f of primary.facets) {
      const h = hidden[f.field];
      if (h?.size) out[f.field] = f.values.map((v) => v.value).filter((v) => !h.has(String(v)));
    }
    return out;
  }, [primary, hidden]);
  /** Beside the filter button: "2 road types hidden" (one filter) or "5 values hidden". */
  const filterSummary = useMemo(() => {
    const set = (primary?.facets ?? []).filter((f) => hidden[f.field]?.size);
    if (!set.length) return null;
    const n = set.reduce((a, f) => a + hidden[f.field].size, 0);
    return set.length === 1 ? `${n} ${n === 1 ? set[0].label.toLowerCase() : pluralLabel(set[0].label)} hidden` : `${n} values hidden`;
  }, [primary, hidden]);

  // Framing (D-35): clicks and picks zoom to their target, clear of open panels, with a way back.
  const { root, canGoBack, goBack, onMapSelect, onFeatureSelect, goToPlace } = useFraming({ mapApi, setSelected, setFeatureSelected, isFeature, primary, tableOpen, narrow });
  const onTableClose = useCallback(() => setTableOpen(false), []);
  const onTablePick = useCallback((geoid: string, name: string, lon: number, lat: number) => {
    if (!tableLevel) return;
    loadPlaceIndex().then((rows) => placeByGeoid(rows, geoid)?.sqmi, () => undefined)
      .then((sqmi) => goToPlace({ geoid, level: tableLevel, name, lon, lat, sqmi }));
  }, [tableLevel, goToPlace]);
  // In change mode the year is the change's later end ("To", issue #168).
  const filterValue: FilterValue = { pinned: pinnedLevel, stop: stopId, since: since?.id ?? null, hidden };
  const nFilters = filterCount(filterValue);
  const toggleFilters = (el: HTMLElement) => setFilters((f) => (f ? null : { anchor: el }));
  /** The level pill: open (never toggle) Filters and bring the geography-level choice into view. */
  const openLevelFilters = () => {
    const btn = document.querySelector<HTMLElement>("[data-filter-button]:not([inert] *)");
    setFilters({ anchor: btn });
    // Two frames: the panel mounts, then lays out.
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector('[role="radiogroup"][aria-label="Geography level"]')?.scrollIntoView({ block: "nearest" })));
  };
  const applyFilters = (v: FilterValue) => {
    setHidden(v.hidden);
    if (v.pinned !== pinnedLevel || v.stop !== stopId || v.since !== (since?.id ?? null)) update({ lv: v.pinned, t: v.stop, since: v.since });
  };
  const onSearchPlace = (p: PlaceHit) => { setSearchOpen(false); goToPlace(p); };
  /** Phones: the dataset list and the details share the bottom sheet; opening one closes the other. */
  const openSheet = () => { setListOpen(true); setSelected(null); setFeatureSelected(null); setTableOpen(false); mapApi.current?.select("county", null); };
  // Opening a place or the table closes the dataset list (adjusted during render, not in an effect).
  if (listOpen && (selected || featureSelected || tableOpen)) setListOpen(false);
  /** Keep the shown year when the next dataset has it too. */
  const keep = (id: string, t: string | null | undefined) => (t && stopsFor(DATASET_BY_ID.get(id) ?? null).some((s) => s.id === t) ? t : null);
  /** The next dataset keeps the shown year, and the change map's start year, when it has them. */
  const keepStops = (id: string) => ({ t: keep(id, state.t), since: keep(id, since?.id) });
  const onSearchDataset = (d: Dataset) => { setSearchOpen(false); update({ d: d.id, b: state.b === d.id ? null : state.b, lv: null, ...keepStops(d.id) }); };
  const pickDataset = (id: string) => update({ d: id, b: state.b === id ? null : state.b, lv: null, ...keepStops(id) });
  const loading = available && !current && !error;
  // Context is about one map, so a comparison shows none.
  const ctx = primary && !secondary ? contextFor(primary.id, ctxPreview) : null;
  // A place, the dataset list, or the phone table takes its place (adjusted during render).
  if (ctxOpen && (selected || featureSelected || listOpen || (phone && tableOpen))) setCtxOpen(false);
  /** Desktop: shift the map left by the panel's width so it doesn't cover the data (review lead, #104),
   *  and back when it closes. Phones: the sheet peeks low, under the data. */
  const padForContext = (open: boolean) => {
    const api = mapApi.current;
    if (!api || phone) return;
    const c = api.getCamera();
    if (open) api.flyTo(c.center[0], c.center[1], c.zoom, { top: 0, bottom: 0, left: 0, right: CONTEXT_PANEL_RIGHT });
    else api.setCamera(c);
  };
  const toggleContext = () => {
    if (!ctxOpen) { setSelected(null); setFeatureSelected(null); mapApi.current?.select("county", null); }
    padForContext(!ctxOpen);
    setCtxOpen(!ctxOpen);
  };
  const closeContext = () => { padForContext(false); setCtxOpen(false); };

  // Reliability hatching (D-222): off when a map opens; the legend's toggle appears only where it
  // means something (an ACS map at tract or block-group level, one dataset, the default period,
  // whose margins of error are the ones published).
  const [hatchOn, setHatchOn] = useState(false);
  const gradable = !!primary && isGradable(primary.measure.kind) && !secondary && !isFeature && !stopId && !since;
  const hatchable = gradable && available && HATCH_LEVELS.has(level);
  const unreliable = useUnreliable(gradable && hatchOn ? primary : null, level, tractCounties);
  const hatch = gradable && hatchOn ? unreliable : null;

  // ── Map-first chrome (D-25) ─────────────────────────────────────────────────
  // At rest: slim header, dataset card, full legend. The first user pan/zoom/scroll
  // "immerses": the navigation falls away, leaving the wordmark, the category and dataset
  // heading (with menus), and the legend. The menu button, the top edge, or Esc brings it back.
  const chromeShown = !immersed || peek;
  // Popups sit under the header while it's showing and move back up when it falls away.
  const panelTop = chromeShown ? HEADER_GAP : 12;
  // Legend: desktop shows it in full; it shrinks to its strip while the filters sidebar needs the room.
  const desktopStrip = !!filters && !phone;
  const hasFilters = !!primary && (availableLevels.length > 1 || primary.facets.length > 0 || stops.length > 0);
  const featureNoun = featureSpec?.geometry === "polygon" ? "Census tracts (2010)" : "Road segments";
  const periodLabel = primary ? (since ? `${since.label} → ${stop!.label}` : stopId ? stop!.label : primary.vintage) : "";
  // Phones keep the meta on one line (issue #34): the period without its note, the short source name.
  const sourceLabel = primary ? (phone && primary.source.shortName) || primary.source.name.split(",")[0].split(" (")[0] : "";
  const meta = primary ? [isFeature ? featureNoun : GEO_LEVELS[level].label, phone ? periodLabel.replace(/ \(.*\)$/, "") : periodLabel, sourceLabel].join(" · ") : "";
  // The table lists one period's values; a change map shows only change, so it has no table.
  // shortcut: no change table yet; add a change column if planners ask for one.
  const tableReady = !!primary && !isFeature && !since && !!tableLevel && !!x.values[tableLevel];
  const placeOpen = !!selected || !!featureSelected;
  // The level caption hints at the next level near a band edge ("block groups closer in"), while
  // switching with zoom.
  const chipHint = useMemo(() => {
    if (isFeature || pinnedLevel) return null;
    const next = availableLevels[availableLevels.indexOf(level) + 1];
    const b = next && bands[next];
    const z = state.at.zoom;
    return b && z >= b.minzoom - 0.75 && z < b.minzoom ? `${GEO_LEVELS[next].plural.toLowerCase()} closer in` : null;
  }, [isFeature, pinnedLevel, availableLevels, level, bands, state.at.zoom]);
  // Left column (desktop): the filters sidebar opens below the title (or the at-rest card) and
  // stops above the legend strip.
  const [sidebarTop, setSidebarTop] = useState(160);
  // Re-measures after every render on purpose (it follows layout changes no dependency list covers); the
  // `top !== sidebarTop` guard stops the loop.
  /* eslint-disable react-hooks/exhaustive-deps */
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !filters || phone) return;
    const owner = immersed ? el.querySelector<HTMLElement>("[data-immersed-heading]") : card.current;
    const top = Math.round((owner?.getBoundingClientRect().bottom ?? 148) + 10);
    if (top !== sidebarTop) setSidebarTop(top);
  });
  /* eslint-enable react-hooks/exhaustive-deps */
  // The selected place's class, marked in the legend (desktop) or the sheet's key (phones).
  const selClassed = selected ? classed[selected.level] : undefined;
  const selClass = selected && selClassed && !secondary ? selClassed.classes.get(selected.geoid) ?? null : null;
  const strip = (v: number) => formatValue(v, primary!.unit).replace(/^(\S+).*$/, "$1");
  const legendKey = selClassed?.ends && primary
    ? { colors: selClassed.colors, cls: selClass, ends: selClassed.ends }
    : selClassed?.breaks?.length && primary && !secondary
    ? { colors: selClassed.colors, cls: selClass, ends: [`< ${strip(selClassed.breaks[0])}`, `≥ ${strip(selClassed.breaks[selClassed.breaks.length - 1])}`] as [string, string] }
    : null;
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
          onUserMove={() => {
            startMotion();
            if (headingMenu) setCloseKey((k) => k + 1);
            setListOpen(false);
            if (!browserOpen) { setImmersed(true); setPeek(false); }
          }}
          onApi={(api) => { mapApi.current = api; }}
          scaleUnit={scaleUnit}
          attribution={false}
          hatch={hatch}
          onTractCounties={setTractCounties}
          watchCounties={testMoes}
          ariaLabel={primary ? `Map of ${since ? "change in " : ""}${primary.title}${since ? ` from ${since.label} to ${stop!.label}` : ""}${secondary ? ` compared with ${secondary.title}` : ""} by ${GEO_LEVELS[level].label.toLowerCase()}` : "Map"}
        />
      </main>

      {/* Header: falls away entirely when immersed; peeks back at the top edge. */}
      <header onMouseLeave={() => setPeek(false)} data-obstructs={chromeShown ? "" : undefined}
        className={`absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background px-4 transition-transform duration-300 ease-out md:px-6 ${chromeShown ? "translate-y-0" : "-translate-y-full"}`}
        aria-hidden={!chromeShown || undefined} inert={!chromeShown || undefined}>
        <HeaderContent current="map" onSearch={() => setSearchOpen(true)} explicitTheme={state.theme} onTheme={(t) => update({ theme: t })}
          unit={scaleUnit} onUnit={setScaleUnit} />
      </header>

      {primary && (
        <DatasetCard cardRef={card} primary={primary} secondary={secondary} meta={meta} immersed={immersed} isFeature={isFeature}
          tableReady={tableReady} hasFilters={hasFilters} filtersOpen={!!filters} filterCount={nFilters} onOpenFilters={toggleFilters}
          onBrowse={() => setBrowserOpen(true)} onTable={() => setTableOpen(true)}
          phone={phone} onOpenSheet={openSheet}
          contextLink={ctx ? <ContextLink open={ctxOpen} onToggle={toggleContext} /> : undefined} />
      )}

      {primary && (
        <ImmersedHeading primary={primary} secondary={secondary} immersed={immersed} hasFilters={hasFilters} filtersOpen={!!filters} filterCount={nFilters}
          caption={isFeature ? filterSummary ?? "All roads shown" : GEO_LEVELS[level].plural} captionHint={isFeature ? null : chipHint}
          phone={phone} motion={stepAside ? (phone ? "hide" : "dim") : null} closeKey={closeKey}
          onShowNav={() => { setImmersed(false); setPeek(false); }} onPick={pickDataset}
          onOpenFilters={toggleFilters} onOpenLevel={openLevelFilters} levelPill={!isFeature} onMenuChange={setHeadingMenu}
          onOpenSheet={phone ? openSheet : undefined} />
      )}

      {filters && primary && !phone && (
        <FiltersSidebar top={sidebarTop} bottom={84} levels={availableLevels} shown={level} facets={primary.facets} stops={stops}
          value={filterValue} onChange={applyFilters} onClose={() => setFilters(null)} hiddenWhileMoving={stepAside || headingMenu} />
      )}
      {filters && primary && phone && (
        <FiltersSheet anchor={filters.anchor} title={primary.title} levels={availableLevels} shown={level} facets={primary.facets} stops={stops}
          value={filterValue} onApply={applyFilters} onClose={() => setFilters(null)} />
      )}

      <MapControls mapApi={mapApi} atRest={chromeShown && !immersed} canGoBack={canGoBack} onBack={goBack} phone={phone} cardH={cardH} />

      <MapLegend theme={theme} primary={primary} secondary={secondary} isFeature={isFeature} featureSpec={featureSpec} current={current}
        error={error} available={available} loading={loading} level={level} periodLabel={periodLabel}
        stop={stop} stopId={stopId} since={since}
        hatchToggle={hatchable ? { on: hatchOn, onChange: setHatchOn, loading: hatchOn && !hatch?.[level] } : null}
        desktopStrip={desktopStrip} mark={selected && selected.level === level ? selClass : null}
        covered={phone && (placeOpen || tableOpen || listOpen || stepAside || ctxOpen)} tableReady={tableReady} onTable={() => setTableOpen(true)} />

      <MapCredits datasets={[primary, secondary].filter((d): d is Dataset => !!d)} />

      {browserOpen && (
        <DatasetsPanel primary={state.d} secondary={state.b} onClose={() => setBrowserOpen(false)}
          onPrimary={(id) => { pickDataset(id); setBrowserOpen(false); }}
          onSecondary={(id) => { update({ b: id, t: null, since: null }); setBrowserOpen(false); }} />
      )}

      {listOpen && phone && primary && <DatasetSheet primary={primary} onPick={pickDataset} onClose={() => setListOpen(false)} />}

      {searchOpen && <SearchOverlay current={state.d} onClose={() => setSearchOpen(false)} onPlace={onSearchPlace} onDataset={onSearchDataset} />}

      {tableOpen && primary && tableLevel && (
        <DataTable top={panelTop} level={tableLevel} x={primary} xv={x.values[tableLevel]} y={secondary} yv={y.values[tableLevel]} period={stopId ? stop!.label : undefined} selected={selected?.geoid ?? null}
          onClose={onTableClose} onPick={onTablePick} />
      )}

      {tilesError && (
        <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-lg border bg-card p-1 shadow-sm">
          <StatusState status="error" message="Boundary tiles aren't available yet." />
        </div>
      )}

      {/* Hover popups wait while the map moves (issue #34). */}
      {hover && !selected && !moving && primary && (
        <PlaceHoverPopup hover={hover} primary={primary} secondary={secondary} xValues={x.values} yValues={y.values} blockField={blockField} periodLabel={stopId ? stop!.label : undefined}
          change={since && classed[hover.level]?.change ? { from: since, to: stop!, fromValues: xFrom.values[hover.level], classed: classed[hover.level]! } : undefined} />
      )}
      {featureHover && !featureSelected && !moving && featureSpec && <FeatureHoverPopup hit={featureHover} spec={featureSpec} primary={primary} />}
      {ctx && ctxOpen && primary && (
        <ContextPanel ctx={ctx} dataset={primary} top={panelTop} onClose={closeContext} onMapIt={(id) => { closeContext(); pickDataset(id); }} />
      )}
      {featureSelected && featureSpec && primary && (
        <FeaturePanel hit={featureSelected} spec={featureSpec} dataset={primary} top={panelTop}
          onClose={() => setFeatureSelected(null)} />
      )}
      {selected && primary && !isFeature && !detailHidden && (
        <DetailPanel info={selected} top={panelTop} onClose={() => { setSelected(null); mapApi.current?.select("county", null); }} primary={primary} secondary={secondary}
          xv={x.values[selected.level]} yv={y.values[selected.level]}
          period={stopId && !since ? { label: stop!.label, defaultLabel: primary.vintage } : undefined}
          change={since && selClassed?.change ? { fromLabel: since.label, toLabel: stop!.label, fromValues: xFrom.values[selected.level], classed: selClassed, toIsDefault: !!stop?.isDefault, boundaryNote: areaChangeNote(since, stop!, selected.level, selected.geoid) } : undefined}
          onMapIt={pickDataset} onPlace={goToPlace} legendKey={legendKey} />
      )}
    </div>
  );
}
