"use client";
// The only module that touches the map library. Swapping in Mapbox GL JS (Q-1) means
// reimplementing this component against the same props.
import { useEffect, useRef } from "react";
import { AttributionControl, Map as MlMap, ScaleControl, addProtocol, setWorkerUrl, type MapGeoJSONFeature } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { basemapStyle, choroplethFill, DATA_BEFORE_ID, featureLineLayers, GEO_LEVELS, MOTION, thematicLayers, type GeoLevel, type ThemeName } from "@webgis/design";
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
}

/** A hovered/clicked feature from a feature layer (road segment, stop…). */
export interface FeatureHit {
  layerId: string;
  properties: Record<string, unknown>;
  x: number;
  y: number;
}

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
  /** Receives zoom controls for the page's own buttons. */
  onApi?: (api: MapApi) => void;
}

export interface MapApi { zoomIn: () => void; zoomOut: () => void }

const TILES_BASE = process.env.NEXT_PUBLIC_TILES_BASE_URL || "/tiles";
const LEVELS = Object.keys(GEO_LEVELS) as GeoLevel[];
let protocolReady = false;

function tilesUrl(level: GeoLevel) {
  const base = TILES_BASE.startsWith("http") ? TILES_BASE : `${window.location.origin}${TILES_BASE}`;
  return `pmtiles://${base}/${level}.pmtiles`;
}

export function MapView({ theme, initialView, paint, onViewChange, onHover, onSelect, onTilesError, ariaLabel, levelZooms, featureLayer, onFeatureHover, onFeatureSelect, onUserMove, onApi }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const applied = useRef<Partial<Record<GeoLevel, LevelPaint>>>({});
  const latest = useRef({ paint, theme, onViewChange, onHover, onSelect, onTilesError, levelZooms, featureLayer, onFeatureHover, onFeatureSelect, onUserMove });
  latest.current = { paint, theme, onViewChange, onHover, onSelect, onTilesError, levelZooms, featureLayer, onFeatureHover, onFeatureSelect, onUserMove };
  /** True once our sources/layers exist on the current style. isStyleLoaded() can't be used:
   *  it stays false while tiles are loading, which silently dropped paint updates. */
  const ready = useRef(false);
  const hovered = useRef<{ level: GeoLevel; id: string } | null>(null);
  const selected = useRef<{ level: GeoLevel; id: string } | null>(null);

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
      center: [initialView.lon, initialView.lat],
      zoom: initialView.zoom,
      attributionControl: false,
      fadeDuration: reduceMotion ? 0 : MOTION.fade,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.current = m;
    // ?debug exposes the map for inspection in devtools / headless checks.
    if (new URLSearchParams(window.location.search).has("debug")) (window as unknown as { __wgMap: MlMap }).__wgMap = m;
    m.touchZoomRotate.disableRotation();
    // Zoom buttons are the page's own (frosted, design-token styled); see onApi.
    m.addControl(new ScaleControl({ unit: "imperial" }), "bottom-right");
    onApi?.({
      zoomIn: () => m.zoomIn({ duration: reduceMotion ? 0 : 250 }),
      zoomOut: () => m.zoomOut({ duration: reduceMotion ? 0 : 250 }),
    });
    // User gestures only (programmatic flyTo etc. must not immerse): wheel/trackpad scroll,
    // drag-pan (mouse or touch), pinch and double-click zoom.
    const userMove = () => latest.current.onUserMove?.();
    m.getCanvasContainer().addEventListener("wheel", userMove, { passive: true });
    m.on("dragstart", userMove);
    m.on("zoomstart", (e) => { if ((e as { originalEvent?: unknown }).originalEvent) userMove(); });
    m.addControl(new AttributionControl({ compact: true, customAttribution: "Boundaries: U.S. Census Bureau TIGER/Line cartographic boundaries" }), "bottom-right");
    // Compact attribution starts expanded; start it collapsed to its ⓘ button on small screens.
    if (window.matchMedia("(max-width: 767px)").matches) {
      m.once("load", () => container.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"));
    }
    m.getCanvas().setAttribute("aria-label", ariaLabel);

    m.on("style.load", () => {
      addThematic(m, latest.current.theme);
      applyBands(m, latest.current.levelZooms);
      ready.current = true;
      applied.current = {};
      syncPaint(m, latest.current.paint, applied.current, latest.current.theme);
      syncFeatureLayer(m, latest.current.featureLayer ?? null, latest.current.theme);
      restoreState(m);
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
      if (!fl || !m.getLayer(`${fl.id}-line`)) return null;
      const r = 6;
      const hits = m.queryRenderedFeatures([[pt.x - r, pt.y - r], [pt.x + r, pt.y + r]], { layers: [`${fl.id}-line`] });
      const f = hits.sort((a, b) => Number(b.properties[fl.valueField] ?? 0) - Number(a.properties[fl.valueField] ?? 0))[0];
      return f ? { layerId: fl.id, properties: f.properties, x: pt.x, y: pt.y } : null;
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
      latest.current.onSelect(f ? infoOf(f, e.point.x, e.point.y) : null);
    });

    function restoreState(mm: MlMap) {
      for (const [ref, key] of [[hovered, "hover"], [selected, "selected"]] as const) {
        if (ref.current) mm.setFeatureState({ source: `b-${ref.current.level}`, sourceLayer: ref.current.level, id: ref.current.id }, { [key]: true });
      }
    }
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

  // Zoom bands: depend on which levels the shown dataset(s) have.
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) applyBands(m, levelZooms);
  }, [levelZooms]);

  // Paint: diff per level and push class indices into feature state.
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) syncPaint(m, paint, applied.current, latest.current.theme);
  }, [paint]);

  // Feature layer (lines/points): swap in/out.
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) syncFeatureLayer(m, featureLayer ?? null, latest.current.theme);
  }, [featureLayer]);

  // Positioning lives on the wrapper: maplibre-gl.css sets `.maplibregl-map { position: relative }`
  // unlayered, which beats Tailwind's layered utilities on the map element itself.
  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" role="region" aria-label={ariaLabel} />
    </div>
  );
}

/** Show each level only within its band; levels without a band are hidden. */
function applyBands(m: MlMap, bands?: Props["levelZooms"]) {
  for (const level of LEVELS) {
    const band = bands ? bands[level] : GEO_LEVELS[level];
    for (const suffix of ["fill", "outline", "highlight"]) {
      const id = `${level}-${suffix}`;
      if (!m.getLayer(id)) continue;
      m.setLayoutProperty(id, "visibility", band ? "visible" : "none");
      if (band) m.setLayerZoomRange(id, band.minzoom, band.maxzoom);
    }
  }
}

function addThematic(m: MlMap, theme: ThemeName) {
  for (const level of LEVELS) {
    if (!m.getSource(`b-${level}`)) m.addSource(`b-${level}`, { type: "vector", url: tilesUrl(level), promoteId: "geoid" });
  }
  // Placeholder colors; the real ones come from syncPaint.
  for (const level of LEVELS) {
    for (const layer of thematicLayers({ source: `b-${level}`, sourceLayer: level, level, colors: [], theme })) {
      if (!m.getLayer(layer.id)) m.addLayer(layer, m.getLayer(DATA_BEFORE_ID) ? DATA_BEFORE_ID : undefined);
    }
  }
}

function syncPaint(m: MlMap, paint: Partial<Record<GeoLevel, LevelPaint>>, applied: Partial<Record<GeoLevel, LevelPaint>>, theme: ThemeName) {
  for (const level of LEVELS) {
    const next = paint[level];
    if (applied[level] === next || !m.getLayer(`${level}-fill`)) continue;
    const source = `b-${level}`;
    m.removeFeatureState({ source, sourceLayer: level });
    if (next) {
      m.setPaintProperty(`${level}-fill`, "fill-color", choroplethFill(next.colors, theme) as never);
      for (const [id, c] of next.classes) m.setFeatureState({ source, sourceLayer: level, id }, { c });
    }
    applied[level] = next;
  }
}

function setFlag(m: MlMap, ref: { current: { level: GeoLevel; id: string } | null }, next: { level: GeoLevel; id: string } | null, key: string) {
  const cur = ref.current;
  if (cur && next && cur.level === next.level && cur.id === next.id) return;
  if (cur) m.setFeatureState({ source: `b-${cur.level}`, sourceLayer: cur.level, id: cur.id }, { [key]: false });
  if (next) m.setFeatureState({ source: `b-${next.level}`, sourceLayer: next.level, id: next.id }, { [key]: true });
  ref.current = next;
}

const FEATURE_SRC = "feature-layer";

/** Show exactly one feature layer (or none), placed above the choropleth and basemap overlays, below labels. */
function syncFeatureLayer(m: MlMap, spec: FeatureLayerSpec | null, theme: ThemeName) {
  const current = m.getStyle().layers.filter((l) => "source" in l && l.source === FEATURE_SRC).map((l) => l.id);
  const wantedIds = spec ? [`${spec.id}-casing`, `${spec.id}-line`] : [];
  if (current.length && current.join() === wantedIds.join()) return;
  for (const id of current) m.removeLayer(id);
  if (m.getSource(FEATURE_SRC)) m.removeSource(FEATURE_SRC);
  for (const id of HIDDEN_WITH_LINES) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", spec ? "none" : "visible");
  if (!spec) return;
  const base = TILES_BASE.startsWith("http") ? TILES_BASE : `${window.location.origin}${TILES_BASE}`;
  m.addSource(FEATURE_SRC, { type: "vector", url: `pmtiles://${base}/${spec.tiles}` });
  const before = m.getLayer("label-water") ? "label-water" : undefined;
  if (spec.geometry === "line") {
    for (const layer of featureLineLayers({ id: spec.id, source: FEATURE_SRC, sourceLayer: spec.sourceLayer, valueField: spec.valueField, breaks: spec.breaks, colors: spec.colors, rankField: spec.rankField, theme })) {
      m.addLayer(layer, before);
    }
  }
}
