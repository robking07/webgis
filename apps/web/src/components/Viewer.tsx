"use client";
// The map page. This file is the orchestrator: URL state, which panels are open, and how they
// connect. The pieces live in ./map-page (data and classification in useViewerData, zoom-to-click
// framing in useFraming, and one file per panel).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StatusState } from "@webgis/design/components";
import { childLevel, formatValue, GEO_LEVELS, HATCH_LEVELS, isGradable, levelBands, type GeoLevel } from "@webgis/design";
import { DataTable } from "./DataTable";
import { MapCredits } from "./MapCredits";
import { SearchOverlay } from "./SearchOverlay";
import { useScaleUnit } from "./SettingsMenu";
import { HeaderContent } from "./SiteHeader";
import { LANDING } from "@/lib/landing";
import { readStoredTheme, useResolvedTheme } from "@/lib/theme";
import { MapView, type FeatureHit, type HoverInfo, type MapApi } from "./map/MapView";
import { DATASET_BY_ID, DATASETS, LIBRARY_LABEL, type Dataset } from "@/lib/registry";
import { areaByCode, loadArea, loadMpoShape, loadPlaceIndex, mpoById, placeByGeoid, type AreaFile, type PlaceHit } from "@/lib/search";
import { useIsCompact, useIsNarrow, useIsPhone } from "./BottomSheet";
import { DatasetMenu, DatasetSheet, type BrowseSlot } from "./DatasetMenus";
import { historyKey, parseUrlState, useUrlState, type UrlState } from "@/lib/url-state";
import { areaChangeNote, stopsFor } from "@/lib/periods";
import { tableScope } from "@/lib/table-scope";
import { useViewerData } from "./map-page/useViewerData";
import { useFraming } from "./map-page/useFraming";
import { HEADER_GAP, CARD_LEFT } from "./map-page/layout";
import { DatasetCard } from "./map-page/DatasetCard";
import { ImmersedHeading } from "./map-page/ImmersedHeading";
import { filterCount, FiltersSheet, FiltersSidebar, pluralLabel, type FilterValue } from "./map-page/FiltersPanel";
import { useMapMotion } from "./map-page/useMapMotion";
import { MapControls } from "./map-page/MapControls";
import { MapLegend } from "./map-page/MapLegend";
import { LeaveComparePrompt } from "./map-page/LeaveComparePrompt";
import { pairReason } from "@/lib/layers";
import { FeatureHoverPopup, PlaceHoverPopup } from "./map-page/HoverPopups";
import { DetailPanel } from "./map-page/DetailPanel";
import { AreaValue } from "./map-page/AreaValue";
import { RegionTotal } from "./map-page/RegionTotal";
import { PickArea, PICK_MAX } from "./map-page/PickArea";
import { MpoPlans } from "./map-page/MpoPlans";
import { useUnreliable } from "./map-page/useUnreliable";
import { FeaturePanel } from "./map-page/FeaturePanel";
import { ContextLink, ContextPanel, CONTEXT_PANEL_RIGHT } from "./map-page/ContextPanel";
import { contextFor } from "@/lib/context";
import { CONUS, usInView } from "@/lib/us-view";
import { citeSources, citeTitle, memoCitation } from "@/lib/cite";
import { imageLegend, mapImage } from "@/lib/map-image";
import { shareUrl, type ShareExtras } from "./ShareButton";
import type { Bbox } from "./map/MapView";

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
  // A ?d= or ?b= that names no dataset: say so once instead of silently showing something else.
  const [unavailable, setUnavailable] = useState(() => {
    const q = new URLSearchParams(search);
    return [q.get("d"), q.get("b")].some((id) => id && !DATASET_BY_ID.has(id));
  });
  const [seenKey, setSeenKey] = useState(historyKey(state));
  if (seenKey !== historyKey(state)) { setSeenKey(historyKey(state)); setUnavailable(false); }
  useEffect(() => { if (unavailable) { const t = setTimeout(() => setUnavailable(false), 8000); return () => clearTimeout(t); } }, [unavailable]);
  const theme = useResolvedTheme(state.theme);
  const [scaleUnit, setScaleUnit] = useScaleUnit();
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [selected, setSelected] = useState<HoverInfo | null>(null);
  const [featureHover, setFeatureHover] = useState<FeatureHit | null>(null);
  const [featureSelected, setFeatureSelected] = useState<FeatureHit | null>(null);
  const [tilesError, setTilesError] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  /** The dataset menu is open, and which map it picks (issue #198); null = closed. Laptops and up:
   *  the title's drop-down; phones: the dataset sheet (issue #225). */
  const [browse, setBrowse] = useState<BrowseSlot | null>(null);
  /** Comparing, a map that can't pair with the second one was opened: ask before leaving compare. */
  const [leaveFor, setLeaveFor] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // A shared drill-down link opens full screen, where the focused place's name shows (issue #203).
  const [immersed, setImmersed] = useState(() => !!initial.in || !!initial.mpo || !!initial.area);
  /** The filters panel (issue #34): a sidebar on desktop, a full-screen sheet on phones. `anchor`
   *  is the filter button it grows from and shrinks back into. */
  const [filters, setFilters] = useState<{ anchor: HTMLElement | null } | null>(null);
  /** Feature-layer facet filters: field → values HIDDEN by the user. */
  const [hidden, setHidden] = useState<Record<string, Set<string>>>({});
  const [peek, setPeek] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
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
  const menuOpen = !!browse && !phone;
  /** Phones: the dataset list is open as a bottom sheet (issue #34). */
  const listOpen = !!browse && phone;
  // "The map wins while it moves" (issue #34): on smaller screens a pan, pinch or scroll closes
  // menus and sets the filters sidebar aside until the map settles; larger monitors keep the
  // sidebar and legend, and only an open dataset list closes.
  const { moving, start: startMotion } = useMapMotion(mapApi);
  const stepAside = moving && compact;

  /** A place is focused (drill-down): Esc keeps the full-screen heading, which shows its name. */
  const focusedRef = useRef(false);
  // Esc brings the chrome back (panels and menus handle their own Esc first).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (!focusedRef.current) setImmersed(false); setPeek(false); setBrowse(null); setLeaveFor(null); }
      // "/" opens search, unless the user is typing somewhere.
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Counties whose tracts are on screen, while hatching or a change map's margin test needs them. */
  const [tractCounties, setTractCounties] = useState<string[]>([]);
  const { primary, secondary, isFeature, featureSpec, stops, stop, stopId, since, xBase, xFrom, testMoes, valueLevels, availableLevels, pinnedLevel, focus, bands, x, y, level, classed, blockField } = useViewerData(state, tractCounties);
  const current = classed[level];
  // A year off the default is colored with the default's breaks (xBase): its failure is an error, not a spinner.
  const error = x.error ?? y.error ?? xFrom.error ?? xBase.error;
  const available = !!primary && !isFeature && availableLevels.includes(level);
  // The table follows the map's level; tracts and block groups only inside a focused area (issue #293).
  const { level: tableLevel, within: tableWithin } = tableScope(level, availableLevels, focus?.geoid ?? null);
  // Clear selections and filters when the dataset changes.
  const [seenDataset, setSeenDataset] = useState(state.d);
  if (seenDataset !== state.d) { setSeenDataset(state.d); setSelected(null); setFeatureSelected(null); setFeatureHover(null); setHidden({}); setCtxOpen(false); setExplainOpen(false); }
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
  // Drill-down (issue #203): a click on a place with a finer level focuses it; each step is a Back step.
  const setFocus = useCallback((geoid: string | null) => update({ in: geoid }), [update]);
  const childOf = useCallback((l: GeoLevel) => childLevel(availableLevels, l), [availableLevels]);
  const { root, canGoBack, focusBack, goBack, onMapSelect, onFeatureSelect, goToPlace, focusName, leaveFocus, clearArea } = useFraming({ mapApi, setSelected, setFeatureSelected, isFeature, primary, tableOpen, narrow, focus: state.in ?? null, setFocus, childOf });
  useEffect(() => { focusedRef.current = !!focus; });
  // Focusing a place goes full screen, where the heading names it (adjusted during render).
  const [seenFocus, setSeenFocus] = useState(focus?.geoid);
  if (seenFocus !== focus?.geoid) { setSeenFocus(focus?.geoid); if (focus) { setImmersed(true); setPeek(false); } }
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
  // Issue #249: a level picked in change mode that has no change data shows its values, with a note.
  const [noChange, setNoChange] = useState<GeoLevel | null>(null);
  useEffect(() => { if (noChange) { const t = setTimeout(() => setNoChange(null), 8000); return () => clearTimeout(t); } }, [noChange]);
  const applyFilters = (v: FilterValue) => {
    setHidden(v.hidden);
    setNoChange(since && !v.since && v.pinned && !availableLevels.includes(v.pinned) ? v.pinned : null);
    if (v.pinned !== pinnedLevel || v.stop !== stopId || v.since !== (since?.id ?? null)) update({ lv: v.pinned, t: v.stop, since: v.since });
  };
  /** A searched MPO (issue #276; the URL's `mpo`) or city or metro area (issue #332; the URL's `area`):
   *  outlined and named, never a geography level, so nothing on the map selects it. Its shape (and a
   *  city's or metro's published numbers) load only once it's picked or linked. */
  const [pickedHit, setPickedHit] = useState<PlaceHit | null>(null);
  const picked = pickedHit && (pickedHit.mpo ? pickedHit.mpo.id === state.mpo : pickedHit.area === state.area) ? pickedHit : null;
  const [areaFile, setAreaFile] = useState<{ code: string; file: AreaFile } | null>(null);
  const frameLinked = useRef(!!(initial.mpo || initial.area) && initial.at.fit && !initial.in); // a link with no at= or in= frames its area once (#393)
  useEffect(() => {
    const id = state.mpo, code = state.area;
    mapApi.current?.showArea(null);
    if (!id && !code) return;
    let live = true;
    loadPlaceIndex().then((rows) => {
      const hit = code ? areaByCode(rows, code) : mpoById(rows, id!);
      if (!hit || !live) return;
      setPickedHit(hit);
      if (frameLinked.current) {
        frameLinked.current = false;
        // As a search pick does; by now the phone/laptop layout is known and panels are measured a frame later.
        if (hit.mpo) { const bbox = hit.mpo.bbox; requestAnimationFrame(() => requestAnimationFrame(() => mapApi.current?.fitBbox(bbox, clearArea()))); }
        else goToPlace(hit);
      }
      if (!code) return loadMpoShape(id!).then((shape) => { if (live) mapApi.current?.showArea(shape); });
      return loadArea(code).then((file) => { if (live) { setAreaFile({ code, file }); mapApi.current?.showArea(file.g); } });
    }).catch(() => {}); // shortcut: an unknown or failed MPO or area just shows no outline; say so if visitors hit it.
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- framing runs once, with the first-render closures
  }, [state.mpo, state.area]);
  /** A found address or the visitor's spot (issue #363): its pin, and the geoid selected there ("" if none). */
  const [pin, setPin] = useState<{ at: [number, number]; geoid?: string } | null>(null);
  // The pin goes once its place's details close or another place is picked (adjusted during render).
  if (pin?.geoid && selected?.geoid !== pin.geoid) setPin(null);
  useEffect(() => { mapApi.current?.showPin(pin?.at ?? null); }, [pin]);
  /** Frame a point at tract zoom and open the details of the place drawn there, on the map already
   *  showing (the anti-steering rule, issue #363): exactly what a tap there does. */
  const goToPoint = (lon: number, lat: number) => {
    setSelected(null); setFeatureSelected(null); mapApi.current?.select("county", null);
    if (state.mpo || state.area) update({ mpo: null, area: null });
    if (focus) leaveFocus();
    setPin({ at: [lon, lat] });
    const b = (focus ? levelBands(availableLevels) : bands).tract;
    const zoom = b ? (b.minzoom + Math.min(b.maxzoom, b.minzoom + 2)) / 2 : 10;
    mapApi.current?.pickAt(lon, lat, zoom, clearArea(true)).then((hit) => setPin({ at: [lon, lat], geoid: hit?.geoid ?? "" }));
  };
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 8000); return () => clearTimeout(t); } }, [toast]);
  /** Phones: "Near me" (issue #363). The position stays in the browser: the tract comes from the map's own tiles. */
  const nearMe = () => {
    setToast("Your location stays on your device. Mapwich uses it only to find your census tract.");
    navigator.geolocation.getCurrentPosition((p) => goToPoint(p.coords.longitude, p.coords.latitude),
      () => setToast("Couldn't get your location."), { timeout: 15000, maximumAge: 60000 });
  };
  const onSearchPlace = (p: PlaceHit) => {
    setSearchOpen(false);
    setPin(null);
    if (p.area) {
      // A city or metro: outlined with its own numbers, framed like any searched place.
      setSelected(null); setFeatureSelected(null); mapApi.current?.select("county", null);
      setPickedHit(p);
      update({ area: p.area, mpo: null });
      goToPlace(p);
      setImmersed(true); setPeek(false);
      return;
    }
    if (!p.mpo) { if (state.mpo || state.area) update({ mpo: null, area: null }); goToPlace(p); return; }
    const { id, bbox } = p.mpo;
    setSelected(null); setFeatureSelected(null); mapApi.current?.select("county", null);
    if (focus) leaveFocus();
    setPickedHit(p);
    update({ mpo: id, area: null });
    setImmersed(true); setPeek(false);
    // Wait a frame so panels that just closed are measured where they now are (as goToPlace does).
    requestAnimationFrame(() => requestAnimationFrame(() => mapApi.current?.fitBbox(bbox, clearArea())));
  };
  /** "Go to" a region and "Back to the US" (issue #202): leave any focused place, frame the region. */
  const goToRegion = (b: Bbox) => {
    if (focus) leaveFocus();
    mapApi.current?.fitBbox(b, { top: 16, right: 16, bottom: 16, left: phone ? 16 : CARD_LEFT });
  };
  // Zoomed out to two worlds, or panned off every U.S. region (Viewer renders on the client only).
  // shortcut: judged on the last settled view, at the window's size; fine while the map is full-window.
  const usLost = !usInView(state.at, window.innerWidth, window.innerHeight);
  /** Phones: the dataset list and the details share the bottom sheet; opening one closes the other. */
  const openMenu = (slot: BrowseSlot) => {
    setBrowse(slot);
    if (phone) { setSelected(null); setFeatureSelected(null); setTableOpen(false); mapApi.current?.select("county", null); }
  };
  // Opening a place or the table closes the dataset list (adjusted during render, not in an effect).
  if (listOpen && (selected || featureSelected || tableOpen)) setBrowse(null);
  /** Keep the shown year when the next dataset has it too. */
  const keep = (id: string, t: string | null | undefined) => (t && stopsFor(DATASET_BY_ID.get(id) ?? null).some((s) => s.id === t) ? t : null);
  /** The next dataset keeps the shown year, and the change map's start year, when it has them. */
  const keepStops = (id: string) => ({ t: keep(id, state.t), since: keep(id, since?.id) });
  const openAlone = (id: string) => update({ d: id, b: null, lv: null, ...keepStops(id) });
  /** A new first map keeps the second while the two can still be compared. The picker greys out the
   *  rest; "Map it", search and the like ask first (Robbie, 2026-10-14). */
  const pickDataset = (id: string) => {
    // Opening the second map itself shows it alone, as before.
    if (!secondary || id === secondary.id) openAlone(id);
    else if (pairReason(DATASET_BY_ID.get(id)!, secondary)) setLeaveFor(id);
    else update({ d: id, lv: null, ...keepStops(id) });
  };
  const onSearchDataset = (d: Dataset) => { setSearchOpen(false); pickDataset(d.id); };
  // shortcut: a county or state picked this way is framed but not selected (the map switch clears the selection); fine while the issue's case is a city.
  const onSearchBoth = (d: Dataset, p: PlaceHit) => { onSearchDataset(d); onSearchPlace(p); };
  // Compare mode (issue #198). Entering, swapping and leaving each add a Back step (useUrlState).
  const pickSecond = (id: string) => update({ b: id, t: null, since: null });
  const swapMaps = () => update({ d: state.b, b: state.d, lv: null, t: null, since: null });
  const exitCompare = () => update({ b: null });
  /** The title opens and closes the dataset menu. While comparing, it first asks which map to
   *  replace (Robbie, 2026-10-14). */
  const changeDataset = () => (browse ? setBrowse(null) : openMenu(secondary ? "ask" : "a"));
  const onMenuPick = (id: string) => { (browse === "b" ? pickSecond : pickDataset)(id); setBrowse(null); };
  // A stale "ask" (the comparison ended) falls back to the one map.
  const slot = browse === "ask" && !secondary ? "a" : browse;
  // Keyed by slot: choosing which map to replace starts a fresh list, with focus in its search box.
  const datasetMenu = menuOpen && slot && primary
    ? <DatasetMenu key={slot} slot={slot} primary={primary} secondary={secondary} onSlot={setBrowse} onPick={onMenuPick} onClose={() => setBrowse(null)} />
    : null;
  const loading = available && !current && !error;
  // Context is about one map, so a comparison shows none.
  const ctx = primary && !secondary ? contextFor(primary.id, ctxPreview) : null;
  // A place, the dataset list, or the docked table (phones and tablets) takes its place (adjusted during render).
  if (ctxOpen && (selected || featureSelected || listOpen || (narrow && tableOpen))) setCtxOpen(false);
  /** Desktop: while the panel is open, the map shifts left by its width so it doesn't cover the data
   *  (review lead, #104); it shifts back however the panel closes (Esc, ×, the link, switching maps, the
   *  table). A place opening keeps the shift: its details panel takes the same spot. Phones: the sheet
   *  peeks low, under the data. Explicit zero padding, as MapApi.setCamera passes (#180). */
  const padded = useRef(false);
  useEffect(() => {
    const api = mapApi.current;
    if (!api || phone || ctxOpen === padded.current) return;
    padded.current = ctxOpen;
    if (!ctxOpen && (selected || featureSelected)) return;
    const c = api.getCamera();
    api.flyTo(c.center[0], c.center[1], c.zoom, { top: 0, bottom: 0, left: 0, right: ctxOpen ? CONTEXT_PANEL_RIGHT : 0 });
  }, [ctxOpen, phone, selected, featureSelected]);
  // Esc with nothing else open leaves the focused place entirely.
  const nothingOpen = !selected && !featureSelected && !browse && !filters && !searchOpen && !tableOpen && !ctxOpen && !leaveFor;
  useEffect(() => {
    if (!focus || !nothingOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") leaveFocus(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, nothingOpen, leaveFocus]);
  const toggleContext = () => {
    if (!ctxOpen) { setSelected(null); setFeatureSelected(null); mapApi.current?.select("county", null); }
    setCtxOpen(!ctxOpen);
  };
  const closeContext = () => setCtxOpen(false);

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
  // Legend: desktop shows it in full (the filters sidebar stops above it); it shrinks to its strip
  // while the dataset menu needs the room (and the card's explainer, which grows the card down into it, #308).
  const desktopStrip = (menuOpen || (explainOpen && !immersed)) && !phone;
  const hasFilters = !!primary && (availableLevels.length > 1 || primary.facets.length > 0 || stops.length > 0);
  const featureNoun = featureSpec?.geometry === "polygon" ? "Census tracts (2010)" : (primary?.measure.kind === "features" && primary.measure.noun) || "Features";
  const periodLabel = primary ? (since ? `${since.label} → ${stop!.label}` : stopId ? stop!.label : primary.vintage) : "";
  // Phones keep the meta on one line (issue #34): the period without its note, the short source name.
  const sourceLabel = primary ? (phone && primary.source.shortName) || primary.source.name.split(",")[0].split(" (")[0] : "";
  const meta = primary ? [isFeature ? featureNoun : GEO_LEVELS[level].label, phone ? periodLabel.replace(/ \(.*\)$/, "") : periodLabel, sourceLabel, ...(primary.library ? [LIBRARY_LABEL] : [])].join(" · ") : "";
  // The table lists one period's values; a change map shows only change, so it has no table.
  // shortcut: no change table yet; add a change column if planners ask for one.
  const tableReady = !!primary && !isFeature && !since && !!tableLevel && !!x.values[tableLevel];
  const placeOpen = !!selected || !!featureSelected;
  // The level caption hints at the next level near a band edge ("block groups closer in"), while
  // switching with zoom.
  const chipHint = useMemo(() => {
    if (isFeature || pinnedLevel || focus) return null;
    const next = availableLevels[availableLevels.indexOf(level) + 1];
    const b = next && bands[next];
    const z = state.at.zoom;
    return b && z >= b.minzoom - 0.75 && z < b.minzoom ? `${GEO_LEVELS[next].plural.toLowerCase()} closer in` : null;
  }, [isFeature, pinnedLevel, focus, availableLevels, level, bands, state.at.zoom]);
  // Left column (desktop): the filters sidebar opens below the title (or the at-rest card) and
  // stops above the legend strip.
  const [sidebarTop, setSidebarTop] = useState(160);
  const [legendH, setLegendH] = useState(0);
  // Re-measures after every render on purpose (it follows layout changes no dependency list covers); the
  // `top !== sidebarTop` guard stops the loop.
  /* eslint-disable react-hooks/exhaustive-deps */
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !filters || phone) return;
    const owner = immersed ? el.querySelector<HTMLElement>("[data-immersed-heading]") : card.current;
    const top = Math.round((owner?.getBoundingClientRect().bottom ?? 148) + 10);
    if (top !== sidebarTop) setSidebarTop(top);
    const legend = [...el.querySelectorAll<HTMLElement>("[data-legend]")].find((e) => e.offsetParent);
    const lh = legend ? Math.round(legend.offsetHeight) : 0;
    if (lh !== legendH) setLegendH(lh);
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
  // Share's citation and image (issue #361): the shown maps, period and place.
  const cited = [primary, secondary].filter((d): d is Dataset => !!d);
  const placeLabel = selected?.name ?? (picked ? picked.name : focus ? focusName : null);
  const share: ShareExtras | null = primary && {
    memo: () => memoCitation({ datasets: cited, place: placeLabel, period: periodLabel, url: shareUrl(), date: new Date() }),
    image: async () => {
      const map = await mapApi.current?.snapshot();
      if (!map) return null;
      const found = imageLegend({ theme, unit: primary.unit, current, feature: featureSpec, biv: secondary && { x: primary.title, y: secondary.title } });
      const legend = found && { ...found, caption: isFeature ? featureNoun : GEO_LEVELS[level].label };
      const blob = await mapImage({ map, theme, title: citeTitle({ datasets: cited, place: placeLabel, period: periodLabel }), legend, sources: citeSources(cited), date: new Date() });
      return blob && { blob, name: `mapwich-${cited.map((d) => d.id).join("-")}.png` };
    },
  };
  // Pick an area (#455): taps toggle tracts while picking; the total stays after Done until Clear.
  const [picking, setPicking] = useState(false);
  // shortcut: picks on a 2010-tract timeline stop are 2010 geoids with no 2020 counts ("numbers are missing"); map them if planners pick on old years.
  const [pickedTracts, setPickedTracts] = useState<string[]>([]);
  const [pickFull, setPickFull] = useState(false);
  const pickable = !!primary && !isFeature && availableLevels.includes("tract");
  const onPick = (g: string) => {
    if (pickedTracts.includes(g)) { setPickedTracts(pickedTracts.filter((t) => t !== g)); setPickFull(false); }
    else if (pickedTracts.length >= PICK_MAX) setPickFull(true);
    else setPickedTracts([...pickedTracts, g]);
  };
  const togglePicking = () => {
    if (!picking) { setSelected(null); setFeatureSelected(null); mapApi.current?.select("county", null); }
    setPicking(!picking);
  };
  const donePicking = useCallback(() => setPicking(false), []);
  const clearPicks = () => { setPickedTracts([]); setPickFull(false); setPicking(false); };
  const pickShown = pickable && (picking || pickedTracts.length > 0) && !(phone && placeOpen);
  // Narrow screens dock the table at the bottom; the details panel waits until it closes.
  const detailHidden = tableOpen && narrow;

  return (
    <div ref={root} className="fixed inset-0 overflow-hidden"
      onMouseMove={(e) => { if (immersed && !peek && e.clientY < 14) setPeek(true); }}>
      <button type="button" onClick={changeDataset}
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:shadow">Choose a dataset</button>

      <main className="absolute inset-0">
        {primary && <h1 className="sr-only">{primary.title}{secondary ? ` and ${secondary.title}` : ""}</h1>}
        <MapView
          theme={theme}
          initialView={initial.at}
          fitLeft={window.innerWidth < 768 ? 16 : CARD_LEFT} /* useIsPhone is still false on the first render, when the map is made */
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
            // An open dataset menu closes on pan everywhere (D-135).
            setBrowse(null);
            setImmersed(true); setPeek(false);
          }}
          onApi={(api) => { mapApi.current = api; }}
          scaleUnit={scaleUnit}
          attribution={false}
          hatch={hatch}
          onTractCounties={setTractCounties}
          watchCounties={testMoes}
          focus={focus}
          picking={picking && pickable}
          onPick={onPick}
          picked={pickable ? pickedTracts : undefined}
          ariaLabel={primary ? `Map of ${since ? "change in " : ""}${primary.title}${since ? ` from ${since.label} to ${stop!.label}` : ""}${secondary ? ` compared with ${secondary.title}` : ""} by ${GEO_LEVELS[level].label.toLowerCase()}` : "Map"}
        />
      </main>

      {/* Header: falls away entirely when immersed; peeks back at the top edge. */}
      <header onMouseLeave={() => setPeek(false)} data-obstructs={chromeShown ? "" : undefined}
        className={`absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background px-4 transition-transform duration-300 ease-out md:px-6 ${chromeShown ? "translate-y-0" : "-translate-y-full"}`}
        inert={!chromeShown || undefined}>
        <HeaderContent current="map" onSearch={() => setSearchOpen(true)} explicitTheme={state.theme} onTheme={(t) => update({ theme: t })}
          unit={scaleUnit} onUnit={setScaleUnit} />
      </header>

      {primary && (
        <DatasetCard share={share!} cardRef={card} explainOpen={explainOpen} setExplainOpen={setExplainOpen} primary={primary} secondary={secondary} meta={meta} immersed={immersed} isFeature={isFeature}
          tableReady={tableReady} hasFilters={hasFilters} filtersOpen={!!filters} filterCount={nFilters} onOpenFilters={toggleFilters}
          onBrowse={changeDataset} menuOpen={menuOpen && !immersed} menu={immersed ? null : datasetMenu}
          onCompare={() => openMenu("b")} onSwap={swapMaps} onExit={exitCompare} onTable={() => setTableOpen(true)} phone={phone}
          contextLink={ctx ? <ContextLink open={ctxOpen} onToggle={toggleContext} /> : undefined} />
      )}

      {primary && (
        <ImmersedHeading primary={primary} secondary={secondary} immersed={immersed} hasFilters={hasFilters} filtersOpen={!!filters} filterCount={nFilters}
          caption={isFeature ? filterSummary ?? "All roads shown" : GEO_LEVELS[level].plural} captionHint={isFeature ? null : chipHint}
          phone={phone} motion={stepAside ? (phone ? "hide" : "dim") : null}
          onShowNav={() => { setImmersed(false); setPeek(false); }} onSearch={() => setSearchOpen(true)}
          onOpenFilters={toggleFilters} onOpenLevel={openLevelFilters} levelPill={!isFeature}
          menuOpen={menuOpen && immersed} menu={immersed ? datasetMenu : null} onBrowse={changeDataset} onExit={exitCompare}
          place={picked ? { name: picked.mpo ? `${picked.name} · ${picked.mpo.states}` : picked.name, onClear: () => update({ mpo: null, area: null }) } : focus && focusName ? { name: focusName, onClear: leaveFocus, back: focusBack, onBack: goBack } : null} backShown={canGoBack || phone}
          detail={picked?.area && primary ? <AreaValue datasets={secondary ? [primary, secondary] : [primary]} code={picked.area} kind={picked.kind} file={areaFile?.code === picked.area ? areaFile.file : null} />
            : picked?.mpo ? <>
              {!isFeature && <RegionTotal key={picked.mpo.id} datasets={secondary ? [primary, secondary] : [primary]} mpo={picked.mpo.id} />}
              <MpoPlans key={`plans-${picked.mpo.id}`} mpo={picked.mpo.id} phone={phone} />
            </> : null} />
      )}

      {filters && primary && !phone && (
        <FiltersSidebar top={sidebarTop} bottom={Math.max(84, legendH + 34)} levels={valueLevels} changeLevels={availableLevels} shown={level} facets={primary.facets} stops={stops}
          value={filterValue} onChange={applyFilters} onClose={() => setFilters(null)} hiddenWhileMoving={stepAside || menuOpen} />
      )}
      {filters && primary && phone && (
        <FiltersSheet anchor={filters.anchor} title={primary.title} levels={valueLevels} changeLevels={availableLevels} shown={level} facets={primary.facets} stops={stops}
          value={filterValue} onApply={applyFilters} onClose={() => setFilters(null)} />
      )}

      <MapControls mapApi={mapApi} atRest={chromeShown && !immersed} canGoBack={canGoBack && !focus} onBack={goBack} phone={phone} cardH={cardH}
        onRegion={goToRegion} onPlace={onSearchPlace} onNearMe={phone && "geolocation" in navigator ? nearMe : null}
        pick={pickable ? { on: picking, off: level !== "tract" && !picking, onToggle: togglePicking } : null} />
      {pickShown && (
        <PickArea datasets={secondary ? [primary!, secondary] : [primary!]} picked={pickedTracts} picking={picking} full={pickFull}
          onDone={donePicking} onClear={clearPicks} />
      )}
      {usLost && (
        <button type="button" onClick={() => goToRegion(CONUS)}
          className="wg-panel wg-zbtn absolute bottom-24 left-1/2 z-20 h-11 -translate-x-1/2 rounded-full px-4 text-sm font-semibold text-foreground">
          Back to the US
        </button>
      )}

      <MapLegend theme={theme} primary={primary} secondary={secondary} isFeature={isFeature} featureSpec={featureSpec} current={current}
        error={error} available={available} loading={loading} level={level} periodLabel={periodLabel}
        stop={stop} stopId={stopId} since={since}
        hatchToggle={hatchable ? { on: hatchOn, onChange: setHatchOn, loading: hatchOn && !hatch?.[level] } : null}
        desktopStrip={desktopStrip} mark={selected && selected.level === level ? selClass : null}
        covered={phone && (placeOpen || tableOpen || listOpen || stepAside || ctxOpen || pickShown)} tableReady={tableReady} tableLevel={tableLevel} onTable={() => setTableOpen(true)}
        // Phones, whenever the header and its search are gone: search above the legend (issues #246, #438).
        onSearch={phone && immersed && !pickShown ? () => setSearchOpen(true) : null} />

      <MapCredits datasets={[primary, secondary].filter((d): d is Dataset => !!d)} />

      {leaveFor && secondary && (
        <LeaveComparePrompt next={DATASET_BY_ID.get(leaveFor)!} other={secondary} onCancel={() => setLeaveFor(null)}
          onOpen={() => { openAlone(leaveFor); setLeaveFor(null); }} />
      )}

      {listOpen && slot && primary && <DatasetSheet key={slot} slot={slot} primary={primary} secondary={secondary} onSlot={setBrowse} onPick={onMenuPick} onClose={() => setBrowse(null)} />}

      {searchOpen && <SearchOverlay full={phone} current={state.d} onClose={() => setSearchOpen(false)} onPlace={onSearchPlace} onDataset={onSearchDataset}
        onBoth={onSearchBoth} onAddress={(m) => { setSearchOpen(false); goToPoint(m.lon, m.lat); }} />}

      {tableOpen && primary && tableLevel && (
        <DataTable top={panelTop} level={tableLevel} within={tableWithin} x={primary} xv={x.values[tableLevel]} y={secondary} yv={y.values[tableLevel]} period={stopId ? stop!.label : undefined} selected={selected?.geoid ?? null}
          onClose={onTableClose} onPick={onTablePick} />
      )}

      {unavailable && primary && (
        <div className="absolute left-1/2 top-16 z-30 max-w-[90vw] -translate-x-1/2 rounded-lg border bg-card p-1 shadow-sm">
          <StatusState status="empty" message={`That map isn't available, so this is ${primary.title}.`} />
        </div>
      )}

      {noChange && noChange === pinnedLevel && !since && (
        <div className="absolute left-1/2 top-16 z-30 max-w-[90vw] -translate-x-1/2 rounded-lg border bg-card p-1 shadow-sm">
          <StatusState status="empty" message={`Change over time isn't available for ${GEO_LEVELS[noChange].plural.toLowerCase()}.`} />
        </div>
      )}

      {toast && (
        <div className="absolute left-1/2 top-16 z-30 max-w-[90vw] -translate-x-1/2 rounded-lg border bg-card p-1 shadow-sm">
          <StatusState status="empty" message={toast} />
        </div>
      )}

      {tilesError && (
        <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-lg border bg-card p-1 shadow-sm">
          <StatusState status="error" message="Boundary tiles aren't available yet." />
        </div>
      )}

      {/* Hover popups wait while the map moves (issue #34). Inside a focused place they show beside its details. */}
      {hover && (!selected || !!focus) && !moving && primary && (
        <PlaceHoverPopup hover={hover} primary={primary} secondary={secondary} xValues={x.values} yValues={y.values} blockField={blockField} periodLabel={stopId ? stop!.label : primary.vintage} unreliable={!!hatch?.[hover.level]?.has(hover.geoid)}
          change={since && classed[hover.level]?.change ? { from: since, to: stop!, fromValues: xFrom.values[hover.level], classed: classed[hover.level]! } : undefined} />
      )}
      {featureHover && !featureSelected && !moving && featureSpec && <FeatureHoverPopup hit={featureHover} spec={featureSpec} primary={primary} />}
      {ctx && ctxOpen && primary && (
        <ContextPanel ctx={ctx} dataset={primary} top={panelTop} onClose={closeContext} onMapIt={pickDataset} />
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
          onMapIt={pickDataset} onPlace={onSearchPlace} legendKey={legendKey} finest={!childLevel(availableLevels, selected.level)} />
      )}
    </div>
  );
}
