"use client";
// The only module that touches the map library. Swapping in Mapbox GL JS (Q-1) means
// reimplementing this component against the same props.
import { useEffect, useRef } from "react";
import { AttributionControl, LngLatBounds, Map as MlMap, ScaleControl, addProtocol, setWorkerUrl, type LayerSpecification, type MapGeoJSONFeature } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { basemapStyle, choroplethFill, choroplethFillsByState, DATA_BEFORE_ID, featureLineLayers, featurePolygonLayers, fillLayerIds, focusLandLayer, FOCUS_LAND_BEFORE_ID, GEO_LEVELS, MOTION, PER_STATE_LEVELS, thematicLayers, type GeoLevel, type ThemeName } from "@webgis/design";
import type { FeatureLayerSpec } from "@/lib/layers";
import type { ViewState } from "@/lib/url-state";

export interface LevelPaint {
  colors: string[];
  /** geoid → class index into `colors` */
  classes: Map<string, number>;
}

export interface HoverInfo {
  geoid: string;
  name: string;
  level: GeoLevel;
  x: number;
  y: number;
  /** Clicked point (click only). */
  lon?: number;
  lat?: number;
}

/** A hovered/clicked feature from a feature layer (road segment, stop…). */
export interface FeatureHit {
  layerId: string;
  properties: Record<string, unknown>;
  x: number;
  y: number;
  /** Where it was clicked (for "learn more" links), and the feature's extent in the tile. */
  lon: number;
  lat: number;
  bbox?: Bbox;
}

/** [west, south, east, north] */
export type Bbox = [number, number, number, number];
export interface Camera { center: [number, number]; zoom: number }
export interface Padding { top: number; right: number; bottom: number; left: number }

/** Basemap layers a feature layer replaces while it's shown (HPMS includes interstates). */
const HIDDEN_WITH_LINES = ["overlay-interstate-casing", "overlay-interstate"];

interface Props {
  theme: ThemeName;
  initialView: ViewState;
  /** Painted levels; a level that is absent is drawn as outlines over "no data". */
  paint: Partial<Record<GeoLevel, LevelPaint>>;
  onViewChange: (v: ViewState) => void;
  onHover: (h: HoverInfo | null) => void;
  onSelect: (h: HoverInfo | null) => void;
  onTilesError?: (msg: string) => void;
  ariaLabel: string;
  /** Override the zoom band per level, e.g. show counties at every zoom on an insight page. */
  levelZooms?: Partial<Record<GeoLevel, { minzoom: number; maxzoom: number }>>;
  /** A lines/points layer drawn from its own geometry, instead of a choropleth. */
  featureLayer?: FeatureLayerSpec | null;
  onFeatureHover?: (h: FeatureHit | null) => void;
  onFeatureSelect?: (h: FeatureHit | null) => void;
  /** First user-initiated pan/zoom/scroll on the map (not programmatic moves). */
  onUserMove?: () => void;
  /** Feature-layer filter: field → values to SHOW (absent field = no filter). */
  featureFilter?: Record<string, Array<string | number>>;
  /** Receives zoom controls for the page's own buttons. */
  onApi?: (api: MapApi) => void;
  /** Scale bar units (Settings). */
  scaleUnit?: "imperial" | "metric";
  /** MapLibre's attribution control. The main map turns it off and shows its own credits
   *  footnote (MapCredits); smaller maps (Odd Pairings) keep it. */
  attribution?: boolean;
  /** County and tract boundary vintage for a timeline stop (D-36): "2019" = 2010 tracts and
   *  pre-2022 Connecticut counties; null = the current tiles. */
  boundaries?: "2019" | null;
  /** Maps inside a scrolling page (Specials, D-115): the page scrolls, and zooming needs
   *  Ctrl/⌘ + scroll or two fingers. */
  cooperative?: boolean;
}

export interface MapApi {
  zoomIn: () => void;
  zoomOut: () => void;
  /** Fly to a point (instant with reduced motion); padding keeps it clear of open panels. */
  flyTo: (lon: number, lat: number, zoom: number, padding?: Padding) => void;
  /** Mark one geography as selected (outline), or clear with null. */
  select: (level: GeoLevel, geoid: string | null) => void;
  /** Frame one geography (its extent from the loaded tiles); false if it isn't loaded. */
  fitGeography: (level: GeoLevel, geoid: string, padding?: Padding) => boolean;
  fitBbox: (bbox: Bbox, padding?: Padding, maxZoom?: number) => void;
  getCamera: () => Camera;
  setCamera: (c: Camera) => void;
}

const TILES_BASE = process.env.NEXT_PUBLIC_TILES_BASE_URL || "/tiles";
const LEVELS = Object.keys(GEO_LEVELS) as GeoLevel[];
let protocolReady = false;

function tilesUrl(level: GeoLevel, boundaries?: string | null) {
  const base = TILES_BASE.startsWith("http") ? TILES_BASE : `${window.location.origin}${TILES_BASE}`;
  return `pmtiles://${base}/${level !== "state" && boundaries ? `${level}-${boundaries}` : level}.pmtiles`;
}

export function MapView({ theme, initialView, paint, onViewChange, onHover, onSelect, onTilesError, ariaLabel, levelZooms, featureLayer, onFeatureHover, onFeatureSelect, onUserMove, onApi, featureFilter, scaleUnit = "imperial", attribution = true, boundaries = null, cooperative = false }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const applied = useRef<Partial<Record<GeoLevel, LevelPaint>>>({});
  const latest = useRef({ paint, theme, onViewChange, onHover, onSelect, onTilesError, levelZooms, featureLayer, onFeatureHover, onFeatureSelect, onUserMove, boundaries });
  latest.current = { paint, theme, onViewChange, onHover, onSelect, onTilesError, levelZooms, featureLayer, onFeatureHover, onFeatureSelect, onUserMove, boundaries };
  /** Boundary vintage the county/tract sources currently point at. */
  const shownBoundaries = useRef<string | null>(null);
  /** True once our sources/layers exist on the current style. isStyleLoaded() can't be used:
   *  it stays false while tiles are loading, which silently dropped paint updates. */
  const ready = useRef(false);
  const hovered = useRef<{ level: GeoLevel; id: string } | null>(null);
  const selected = useRef<{ level: GeoLevel; id: string } | null>(null);
  const scale = useRef<ScaleControl | null>(null);

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    if (!protocolReady) {
      setWorkerUrl(new URL("/maplibre/maplibre-gl-worker.mjs", window.location.href).href);
      addProtocol("pmtiles", new Protocol().tile);
      protocolReady = true;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const m = new MlMap({
      container: container.current,
      style: basemapStyle(latest.current.theme),
      // No `at` in the URL: frame the lower 48 to the screen, so phones see the whole country too.
      ...(initialView.fit ? { bounds: CONUS, fitBoundsOptions: { padding: 16 } } : { center: [initialView.lon, initialView.lat] as [number, number], zoom: initialView.zoom }),
      attributionControl: false,
      fadeDuration: reduceMotion ? 0 : MOTION.fade,
      dragRotate: false,
      pitchWithRotate: false,
      cooperativeGestures: cooperative,
    });
    map.current = m;
    // ?debug exposes the map for inspection in devtools / headless checks.
    if (new URLSearchParams(window.location.search).has("debug")) (window as unknown as { __wgMap: MlMap }).__wgMap = m;
    m.touchZoomRotate.disableRotation();
    // Zoom buttons are the page's own (frosted, design-token styled); see onApi.
    scale.current = new ScaleControl({ unit: scaleUnit });
    m.addControl(scale.current, "bottom-right");
    const fly = reduceMotion ? 0 : MOTION.fly;
    const fitBbox = (b: Bbox, padding?: Padding, maxZoom = 13) => m.fitBounds(b, { padding: safePadding(m, padding), maxZoom, duration: fly, essential: true });
    onApi?.({
      zoomIn: () => m.zoomIn({ duration: reduceMotion ? 0 : 250 }),
      zoomOut: () => m.zoomOut({ duration: reduceMotion ? 0 : 250 }),
      flyTo: (lon, lat, zoom, padding) => m.flyTo({ center: [lon, lat], zoom, padding: safePadding(m, padding), duration: fly, essential: true }),
      select: (level, geoid) => setFlag(m, selected, geoid ? { level, id: geoid } : null, "selected"),
      fitGeography: (level, geoid, padding) => {
        const b = geographyBbox(m, level, geoid);
        if (b) fitBbox(b, padding);
        return !!b;
      },
      fitBbox,
      getCamera: () => ({ center: m.getCenter().toArray() as [number, number], zoom: m.getZoom() }),
      setCamera: (c) => m.flyTo({ ...c, padding: 0, duration: fly, essential: true }),
    });
    // User gestures only (programmatic flyTo etc. must not immerse): wheel/trackpad scroll,
    // drag-pan (mouse or touch), pinch and double-click zoom.
    const userMove = () => latest.current.onUserMove?.();
    m.getCanvasContainer().addEventListener("wheel", userMove, { passive: true });
    m.on("dragstart", userMove);
    m.on("zoomstart", (e) => { if ((e as { originalEvent?: unknown }).originalEvent) userMove(); });
    if (attribution) {
      m.addControl(new AttributionControl({ compact: true, customAttribution: "Boundaries: U.S. Census Bureau TIGER/Line cartographic boundaries" }), "bottom-right");
      // Compact attribution starts expanded; start it collapsed to its ⓘ button on any map too narrow
      // for the one-line credit (phones, and the small maps on Odd Pairing pages).
      if (container.current.clientWidth < 900) {
        m.once("load", () => container.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"));
      }
    }
    m.getCanvas().setAttribute("aria-label", ariaLabel);

    m.on("style.load", () => {
      addThematic(m, latest.current.theme, latest.current.boundaries);
      shownBoundaries.current = latest.current.boundaries;
      applyBands(m, latest.current.levelZooms);
      ready.current = true;
      applied.current = {};
      syncPaint(m, latest.current.paint, applied.current, latest.current.theme);
      syncFeatureLayer(m, latest.current.featureLayer ?? null, latest.current.theme);
      applyFeatureFilter(m, latest.current.featureLayer ?? null, filterRef.current);
      restoreFlags(m, hovered.current, selected.current);
    });
    m.on("moveend", () => {
      const c = m.getCenter();
      latest.current.onViewChange({ lon: c.lng, lat: c.lat, zoom: m.getZoom() });
    });
    m.on("error", (e) => {
      const msg = String(e.error?.message ?? e.error ?? "");
      if (/pmtiles|tiles\//i.test(msg) || /404/.test(msg)) latest.current.onTilesError?.(msg);
    });

    const fillIds = LEVELS.map((l) => `${l}-fill`);
    const infoOf = (f: MapGeoJSONFeature, x: number, y: number): HoverInfo => ({
      geoid: String(f.properties.geoid), name: String(f.properties.name), level: f.sourceLayer as GeoLevel, x, y,
    });
    /** Lines are thin: hit-test a small box around the pointer, busiest (top-drawn) first. */
    const featureAt = (pt: { x: number; y: number }): FeatureHit | null => {
      const fl = latest.current.featureLayer;
      const hitLayer = fl ? `${fl.id}-${fl.geometry === "polygon" ? "fill" : "line"}` : "";
      if (!fl || !m.getLayer(hitLayer)) return null;
      const r = fl.geometry === "polygon" ? 0 : 6;
      const hits = m.queryRenderedFeatures([[pt.x - r, pt.y - r], [pt.x + r, pt.y + r]], { layers: [hitLayer] });
      const f = hits.sort((a, b) => Number(b.properties[fl.valueField] ?? 0) - Number(a.properties[fl.valueField] ?? 0))[0];
      if (!f) return null;
      const ll = m.unproject([pt.x, pt.y]);
      return { layerId: fl.id, properties: f.properties, x: pt.x, y: pt.y, lon: ll.lng, lat: ll.lat, bbox: geometryBbox(f.geometry) };
    };
    m.on("mousemove", (e) => {
      if (latest.current.featureLayer) {
        const hit = featureAt(e.point);
        m.getCanvas().style.cursor = hit ? "pointer" : "";
        latest.current.onFeatureHover?.(hit);
        return;
      }
      const f = m.queryRenderedFeatures(e.point, { layers: fillIds.filter((id) => m.getLayer(id)) })[0];
      setFlag(m, hovered, f ? { level: f.sourceLayer as GeoLevel, id: String(f.properties.geoid) } : null, "hover");
      m.getCanvas().style.cursor = f ? "pointer" : "";
      latest.current.onHover(f ? infoOf(f, e.point.x, e.point.y) : null);
    });
    m.on("mouseout", () => { setFlag(m, hovered, null, "hover"); latest.current.onHover(null); latest.current.onFeatureHover?.(null); });
    m.on("click", (e) => {
      if (latest.current.featureLayer) { latest.current.onFeatureSelect?.(featureAt(e.point)); return; }
      const f = m.queryRenderedFeatures(e.point, { layers: fillIds.filter((id) => m.getLayer(id)) })[0];
      setFlag(m, selected, f ? { level: f.sourceLayer as GeoLevel, id: String(f.properties.geoid) } : null, "selected");
      latest.current.onSelect(f ? { ...infoOf(f, e.point.x, e.point.y), lon: e.lngLat.lng, lat: e.lngLat.lat } : null);
    });

    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme: rebuild the style; style.load re-adds thematic layers and paint.
  const firstTheme = useRef(true);
  useEffect(() => {
    if (firstTheme.current) { firstTheme.current = false; return; }
    ready.current = false;
    map.current?.setStyle(basemapStyle(theme));
  }, [theme]);

  useEffect(() => { scale.current?.setUnit(scaleUnit); }, [scaleUnit]);

  // Zoom bands: depend on which levels the shown dataset(s) have.
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) applyBands(m, levelZooms);
  }, [levelZooms]);

  // Boundary vintage (timeline stops before 2020): swap the county/tract sources, keep the layers.
  // Runs before the paint effect, which then repaints the new sources.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current || shownBoundaries.current === boundaries) return;
    swapBoundaries(m, boundaries);
    shownBoundaries.current = boundaries;
    delete applied.current.county; delete applied.current.tract;
    syncPaint(m, latest.current.paint, applied.current, latest.current.theme);
    restoreFlags(m, hovered.current, selected.current);
  }, [boundaries]);

  // Paint: diff per level and push class indices into feature state.
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) { syncPaint(m, paint, applied.current, latest.current.theme); restoreFlags(m, hovered.current, selected.current); }
  }, [paint]);

  // Feature layer (lines/points): swap in/out, then apply its filter.
  const filterRef = useRef(featureFilter);
  filterRef.current = featureFilter;
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) { syncFeatureLayer(m, featureLayer ?? null, latest.current.theme); applyFeatureFilter(m, featureLayer ?? null, filterRef.current); }
  }, [featureLayer]);
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) applyFeatureFilter(m, latest.current.featureLayer ?? null, featureFilter);
  }, [featureFilter]);

  // Positioning lives on the wrapper: maplibre-gl.css sets `.maplibregl-map { position: relative }`
  // unlayered, which beats Tailwind's layered utilities on the map element itself.
  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" role="region" aria-label={ariaLabel} />
    </div>
  );
}

/** Show each level only within its band; levels without a band are hidden. The selection
 *  outline stays on at every zoom, so a county picked from the table or search still shows
 *  while tracts are drawn (it only draws for the one selected/hovered feature). */
function applyBands(m: MlMap, bands?: Props["levelZooms"]) {
  for (const level of LEVELS) {
    const band = bands ? bands[level] : GEO_LEVELS[level];
    for (const id of [...fillLayerIds(level), `${level}-outline`]) {
      if (!m.getLayer(id)) continue;
      m.setLayoutProperty(id, "visibility", band ? "visible" : "none");
      if (band) m.setLayerZoomRange(id, band.minzoom, band.maxzoom);
    }
    for (const id of [`${level}-highlight-halo`, `${level}-highlight`]) if (m.getLayer(id)) m.setLayerZoomRange(id, 0, 24);
  }
}

/** The lower 48 (search and first load frame it; Alaska, Hawaii and PR are a pan away). */
const CONUS: Bbox = [-124.8, 24.4, -66.9, 49.4];

/** Panel padding can't leave the map less than ~120 px of room, or fitBounds gives up. */
function safePadding(m: MlMap, p?: Padding): Padding | undefined {
  if (!p) return undefined;
  const { clientWidth: w, clientHeight: h } = m.getContainer();
  const fit = (a: number, b: number, total: number) => (a + b > total - 120 ? [Math.max(0, (total - 120) * a / (a + b)), Math.max(0, (total - 120) * b / (a + b))] : [a, b]);
  const [left, right] = fit(p.left, p.right, w);
  const [top, bottom] = fit(p.top, p.bottom, h);
  return { left, right, top, bottom };
}

/** Extent of one geography from every loaded tile that holds a piece of it. */
function geographyBbox(m: MlMap, level: GeoLevel, geoid: string): Bbox | null {
  if (!m.getSource(`b-${level}`)) return null;
  const parts = m.querySourceFeatures(`b-${level}`, { sourceLayer: level, filter: ["==", ["get", "geoid"], geoid] });
  if (!parts.length) return null;
  const b = new LngLatBounds();
  for (const f of parts) { const g = geometryBbox(f.geometry); if (g) b.extend(g); }
  return b.isEmpty() ? null : (b.toArray().flat() as Bbox);
}

function geometryBbox(g: GeoJSON.Geometry): Bbox | undefined {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const walk = (c: unknown): void => {
    if (typeof (c as number[])[0] === "number") {
      const [x, y] = c as number[];
      if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y;
    } else (c as unknown[]).forEach(walk);
  };
  if ("coordinates" in g) walk(g.coordinates);
  return Number.isFinite(w) ? [w, s, e, n] : undefined;
}

function addThematic(m: MlMap, theme: ThemeName, boundaries: string | null) {
  for (const level of LEVELS) {
    if (!m.getSource(`b-${level}`)) m.addSource(`b-${level}`, { type: "vector", url: tilesUrl(level, boundaries), promoteId: "geoid" });
  }
  // U.S. land a step lighter than neighbors, under water and parks (always on).
  if (!m.getLayer("us-focus-land")) m.addLayer(focusLandLayer("b-state", theme), m.getLayer(FOCUS_LAND_BEFORE_ID) ? FOCUS_LAND_BEFORE_ID : undefined);
  // Placeholder colors; the real ones come from syncPaint.
  for (const level of LEVELS) {
    for (const layer of thematicLayers({ source: `b-${level}`, sourceLayer: level, level, colors: [], theme })) {
      if (!m.getLayer(layer.id)) m.addLayer(layer, m.getLayer(DATA_BEFORE_ID) ? DATA_BEFORE_ID : undefined);
    }
  }
  // Selection outlines go above every level's fill, so a county picked while tracts are drawn still shows.
  for (const level of LEVELS) for (const id of [`${level}-highlight-halo`, `${level}-highlight`]) {
    if (m.getLayer(id)) m.moveLayer(id, m.getLayer(DATA_BEFORE_ID) ? DATA_BEFORE_ID : undefined);
  }
}

/** Point the county and tract sources at another boundary vintage. A source's URL can't be
 *  changed in place, so its layers are lifted out (keeping their order, zoom bands and paint),
 *  the source is replaced, and the layers go back where they were. */
function swapBoundaries(m: MlMap, boundaries: string | null) {
  for (const level of ["county", "tract"] as const) {
    const src = `b-${level}`;
    if (!m.getSource(src)) continue;
    const all = m.getStyle().layers;
    const mine = all.filter((l) => "source" in l && l.source === src);
    const ids = new Set(mine.map((l) => l.id));
    const before = mine.map((l) => all.slice(all.findIndex((x) => x.id === l.id) + 1).find((x) => !ids.has(x.id))?.id);
    for (const l of mine) m.removeLayer(l.id);
    m.removeSource(src);
    m.addSource(src, { type: "vector", url: tilesUrl(level, boundaries), promoteId: "geoid" });
    mine.forEach((l, i) => m.addLayer(l, before[i]));
  }
}

function syncPaint(m: MlMap, paint: Partial<Record<GeoLevel, LevelPaint>>, applied: Partial<Record<GeoLevel, LevelPaint>>, theme: ThemeName) {
  for (const level of LEVELS) {
    const next = paint[level];
    if (applied[level] === next || !m.getLayer(`${level}-fill`)) continue;
    // Data-driven expressions evaluated in the tile workers, no per-feature state (D-114).
    if (PER_STATE_LEVELS.has(level)) {
      const fills = choroplethFillsByState(level, next?.colors ?? [], next?.classes ?? new Map(), theme);
      for (const [id, color] of Object.entries(fills)) if (m.getLayer(id)) m.setPaintProperty(id, "fill-color", color as never);
    } else {
      m.setPaintProperty(`${level}-fill`, "fill-color", choroplethFill(next?.colors ?? [], next?.classes ?? new Map(), theme) as never);
    }
    applied[level] = next;
  }
}

/** Repainting clears feature state per source; put the hover/selection flags back. */
function restoreFlags(m: MlMap, hover: { level: GeoLevel; id: string } | null, sel: { level: GeoLevel; id: string } | null) {
  for (const [f, key] of [[hover, "hover"], [sel, "selected"]] as const) {
    if (f && m.getSource(`b-${f.level}`)) m.setFeatureState({ source: `b-${f.level}`, sourceLayer: f.level, id: f.id }, { [key]: true });
  }
}

function setFlag(m: MlMap, ref: { current: { level: GeoLevel; id: string } | null }, next: { level: GeoLevel; id: string } | null, key: string) {
  const cur = ref.current;
  if (cur && next && cur.level === next.level && cur.id === next.id) return;
  // Remove rather than set false, so hover entries don't pile up in the source's state.
  if (cur) m.removeFeatureState({ source: `b-${cur.level}`, sourceLayer: cur.level, id: cur.id }, key);
  if (next) m.setFeatureState({ source: `b-${next.level}`, sourceLayer: next.level, id: next.id }, { [key]: true });
  ref.current = next;
}

const FEATURE_SRC = "feature-layer";
const FEATURE_TAG = "wg:feature";

/** Show exactly one feature layer (or none), placed above the choropleth and basemap overlays, below labels. */
function syncFeatureLayer(m: MlMap, spec: FeatureLayerSpec | null, theme: ThemeName) {
  // Every layer we add is tagged, including ones on the basemap source (the polygon water mask).
  const current = m.getStyle().layers.filter((l) => (l.metadata as Record<string, unknown> | undefined)?.[FEATURE_TAG]).map((l) => l.id);
  const opts = spec && { id: spec.id, source: FEATURE_SRC, sourceLayer: spec.sourceLayer, valueField: spec.valueField, breaks: spec.breaks, colors: spec.colors, rankField: spec.rankField, theme };
  const wanted = !spec || !opts ? [] : spec.geometry === "polygon" ? featurePolygonLayers(opts) : featureLineLayers(opts);
  if (current.length && current.join() === wanted.map((l) => l.id).join()) return;
  for (const id of current) m.removeLayer(id);
  if (m.getSource(FEATURE_SRC)) m.removeSource(FEATURE_SRC);
  for (const id of HIDDEN_WITH_LINES) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", spec?.geometry === "line" ? "none" : "visible");
  if (!spec) return;
  const base = TILES_BASE.startsWith("http") ? TILES_BASE : `${window.location.origin}${TILES_BASE}`;
  m.addSource(FEATURE_SRC, { type: "vector", url: `pmtiles://${base}/${spec.tiles}` });
  // Lines sit above the overlays they replace; areas sit with the data, under rivers/interstates.
  const before = spec.geometry === "polygon"
    ? (m.getLayer(DATA_BEFORE_ID) ? DATA_BEFORE_ID : undefined)
    : (m.getLayer("label-water") ? "label-water" : undefined);
  for (const layer of wanted) m.addLayer({ ...layer, metadata: { [FEATURE_TAG]: true } } as LayerSpecification, before);
}

/** Show only features whose facet values are allowed. Values may be numbers or strings in the tiles. */
function applyFeatureFilter(m: MlMap, spec: FeatureLayerSpec | null, filter?: Record<string, Array<string | number>>) {
  if (!spec) return;
  const clauses = Object.entries(filter ?? {}).map(([field, vals]) => [
    "in", ["to-string", ["get", field]], ["literal", vals.map(String)],
  ]);
  const expr = clauses.length ? ["all", ...clauses] : null;
  for (const id of [`${spec.id}-casing`, `${spec.id}-line`, `${spec.id}-fill`]) if (m.getLayer(id)) m.setFilter(id, expr as never);
}
