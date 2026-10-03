"use client";
// The map page. This file is the orchestrator: URL state, which panels are open, and how they
// connect. The pieces live in ./map-page (data and classification in useViewerData, zoom-to-click
// framing in useFraming, and one file per panel).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusState } from "@webgis/design/components";
import { GEO_LEVELS, type GeoLevel } from "@webgis/design";
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
import { useIsNarrow, useIsPhone } from "./BottomSheet";
import { parseUrlState, useUrlState, type UrlState } from "@/lib/url-state";
import { stopsFor } from "@/lib/periods";
import { useViewerData } from "./map-page/useViewerData";
import { useFraming } from "./map-page/useFraming";
import { HEADER_GAP } from "./map-page/layout";
import { DatasetCard } from "./map-page/DatasetCard";
import { ImmersedHeading } from "./map-page/ImmersedHeading";
import { DisplayOptions } from "./map-page/DisplayOptions";
import { MapControls } from "./map-page/MapControls";
import { MapLegend } from "./map-page/MapLegend";
import { DatasetsPanel } from "./map-page/DatasetsPanel";
import { FeatureHoverPopup, PlaceHoverPopup } from "./map-page/HoverPopups";
import { DetailPanel } from "./map-page/DetailPanel";
import { FeaturePanel } from "./map-page/FeaturePanel";

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
  const [optionsOpen, setOptionsOpen] = useState(false);
  /** Immersed: the display options dock (level + filters) under the heading. */
  const [dockOpen, setDockOpen] = useState(false);
  /** Immersed: the category or dataset menu is open. */
  const [headingMenu, setHeadingMenu] = useState(false);
  /** Feature-layer facet filters: field → values HIDDEN by the user. */
  const [hidden, setHidden] = useState<Record<string, Set<string>>>({});
  const [peek, setPeek] = useState(false);
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

  const { primary, secondary, isFeature, featureSpec, stops, stop, stopId, availableLevels, pinnedLevel, bands, x, y, level, classed, blockField } = useViewerData(state);
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

  // Framing (D-35): clicks and picks zoom to their target, clear of open panels, with a way back.
  const { root, canGoBack, goBack, onMapSelect, onFeatureSelect, goToPlace } = useFraming({ mapApi, setSelected, setFeatureSelected, isFeature, primary, tableOpen, narrow });
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
  const chromeShown = !immersed || peek;
  // Popups sit under the header while it's showing and move back up when it falls away.
  const panelTop = chromeShown ? HEADER_GAP : 12;
  // Legend: desktop shows it in full; it shrinks to its strip only while Display options needs the room.
  const desktopStrip = optionsOpen && !immersed;
  const hasOptions = !!primary && (availableLevels.length > 1 || primary.facets.length > 0);
  const featureNoun = featureSpec?.geometry === "polygon" ? "Census tracts (2010)" : "Road segments";
  const periodLabel = primary ? (stopId ? stop!.label : primary.vintage) : "";
  const meta = primary ? [isFeature ? featureNoun : GEO_LEVELS[level].label, periodLabel, primary.source.name.split(",")[0].split(" (")[0]].join(" · ") : "";
  const displayOptions = (docked: boolean) => (
    <DisplayOptions levels={availableLevels} pinned={pinnedLevel} shown={level} facets={primary?.facets} hidden={hidden} docked={docked}
      onLevel={(l) => update({ lv: l === "auto" ? null : l })} onToggle={toggleFacet}
      onAll={(field) => setHidden((cur) => ({ ...cur, [field]: new Set() }))} />
  );
  const tableReady = !!primary && !isFeature && !!tableLevel && !!x.values[tableLevel];
  // One panel at a time (issue #32): the dock's halo'd text has no backing, so it hides while a
  // dataset menu is open over it.
  const dockShown = !!primary && immersed && hasOptions && (dockOpen || filtersActive) && !headingMenu;
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

      {primary && (
        <DatasetCard cardRef={card} primary={primary} secondary={secondary} meta={meta} immersed={immersed} isFeature={isFeature}
          tableReady={tableReady} hasOptions={hasOptions} optionsOpen={optionsOpen} onToggleOptions={() => setOptionsOpen((o) => !o)}
          onBrowse={() => setBrowserOpen(true)} onTable={() => setTableOpen(true)} options={displayOptions(false)} />
      )}

      {primary && (
        <ImmersedHeading primary={primary} secondary={secondary} immersed={immersed} hasOptions={hasOptions} dockShown={dockShown}
          chipLabel={isFeature ? (filtersActive ? "Filters on" : "Filters") : GEO_LEVELS[level].plural}
          onShowNav={() => { setImmersed(false); setPeek(false); }} onPick={pickDataset}
          onToggleDock={() => setDockOpen((o) => !(o || filtersActive))} onMenuChange={setHeadingMenu} />
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

      <MapControls mapApi={mapApi} atRest={chromeShown && !immersed} canGoBack={canGoBack} onBack={goBack} phone={phone} cardH={cardH} />

      <MapLegend theme={theme} primary={primary} secondary={secondary} isFeature={isFeature} featureSpec={featureSpec} current={current}
        error={error} available={available} loading={loading} level={level} periodLabel={periodLabel}
        stops={stops} stop={stop} stopId={stopId} onStop={(id) => update({ t: stops.find((s) => s.id === id)?.isDefault ? null : id })}
        desktopStrip={desktopStrip} immersed={immersed} covered={phone && (!!selected || !!featureSelected || tableOpen)} tableReady={tableReady} onTable={() => setTableOpen(true)} />

      <MapCredits datasets={[primary, secondary].filter((d): d is Dataset => !!d)} />

      {browserOpen && (
        <DatasetsPanel primary={state.d} secondary={state.b} onClose={() => setBrowserOpen(false)}
          onPrimary={(id) => { pickDataset(id); setBrowserOpen(false); }}
          onSecondary={(id) => { update({ b: id, t: null }); setBrowserOpen(false); }} />
      )}

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

      {hover && !selected && primary && (
        <PlaceHoverPopup hover={hover} primary={primary} secondary={secondary} xValues={x.values} yValues={y.values} blockField={blockField} periodLabel={stopId ? stop!.label : undefined} />
      )}
      {featureHover && !featureSelected && featureSpec && <FeatureHoverPopup hit={featureHover} spec={featureSpec} primary={primary} />}
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
