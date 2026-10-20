"use client";
// The only module that touches the map library. Swapping in Mapbox GL JS (Q-1) means
// reimplementing this component against the same props.
import { useEffect, useLayoutEffect, useRef } from "react";
import { AttributionControl, LngLatBounds, Map as MlMap, ScaleControl, addProtocol, setWorkerUrl, type LayerSpecification, type MapGeoJSONFeature } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { areaHighlightLayers, AREA_SOURCE, basemapStyle, choroplethFill, hatchImage, hatchLayerId, HATCH_IMAGE, HATCH_LEVELS, membershipFilter, NO_FEATURES, choroplethFillsByState, DATA_BEFORE_ID, STATIC_ONLY_LEVELS, TILE_VALUE_LEVELS, THEMES, featureLineLayers, featurePolygonLayers, fillLayerIds, focusDimLayer, FOCUS_DIM_LAYER, focusFilters, focusLandLayer, FOCUS_LAND_BEFORE_ID, GEO_LEVELS, MOTION, PER_STATE_LEVELS, thematicLayers, type GeoLevel, type NoDataFill, type PackedClasses, type ThemeName } from "@webgis/design";
import { comparePickOpen } from "@/lib/compare";
import type { FeatureLayerSpec } from "@/lib/layers";
import type { ViewState } from "@/lib/url-state";
import type { Geometry } from "geojson";
import { boundaryFile } from "@webgis/registry/timeline";
import { TILES_BASE } from "@/lib/static-files";

export interface LevelPaint {
  colors: string[];
  /** geoid → class index into `colors` */
  classes: Map<string, number>;
  /** Levels with values in the tiles (blocks): color by this property with `breaks`. */
  field?: string;
  breaks?: number[];
  /** Theme token for areas without a value (change maps have their own). */
  noData?: NoDataFill;
  /** `classes` already packed for the per-state layers (by the values worker; issue #28). */
  packed?: PackedClasses;
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
  /** Tile properties (blocks carry their values here). */
  props?: Record<string, unknown>;
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
  /** Our own tiles (boundaries or a feature layer) failed to load; null once they load again. */
  onTilesError?: (msg: string | null) => void;
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
  /** Reliability hatching (D-222): unreliable geoids per level; null or absent = hatching off. */
  hatch?: Partial<Record<GeoLevel, ReadonlySet<string>>> | null;
  /** While hatching (or `watchCounties`) is on: the counties (5-digit FIPS) whose tracts are on screen, when they change. */
  onTractCounties?: (counties: string[]) => void;
  /** Report onTractCounties without hatching (a change map testing tract margins of error). */
  watchCounties?: boolean;
  /** Compare places (D-258, D-330): outline `a` (solid) and `b` (dashed), open on `bbox` and fit the
   *  `fit` place's outline once its tiles are in. Clicks and hover don't select anything else. */
  compare?: { level: GeoLevel; a: string; b: string; bbox: Bbox; fit: "a" | "b" };
  /** Drill-down (issue #203): the clicked-into place. Its `child` level draws only inside it, the rest
   *  of its level sits under a dim wash, and hover and clicks reach only its children. */
  focus?: Focus | null;
}

export interface Focus { level: GeoLevel; geoid: string; child: GeoLevel }

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
  /** A gesture or camera animation is in progress (a finger held down mid-drag counts). */
  isMoving: () => boolean;
  /** Outline an area that has no tiles (a searched MPO, issue #276), or clear with null. Never clickable. */
  showArea: (shape: Geometry | null) => void;
}

const LEVELS = Object.keys(GEO_LEVELS) as GeoLevel[];
let protocolReady = false;

/** A PMTiles archive on the tiles base (made absolute: the pmtiles protocol needs a full URL). */
function pmtilesUrl(path: string) {
  const base = TILES_BASE.startsWith("http") ? TILES_BASE : `${window.location.origin}${TILES_BASE}`;
  return `pmtiles://${base}/${path}`;
}
const tilesUrl = (level: GeoLevel, boundaries?: string | null) => pmtilesUrl(`${boundaryFile(level, boundaries)}.pmtiles`);

export function MapView({ theme, initialView, paint, onViewChange, onHover, onSelect, onTilesError, ariaLabel, levelZooms, featureLayer, onFeatureHover, onFeatureSelect, onUserMove, onApi, featureFilter, scaleUnit = "imperial", attribution = true, boundaries = null, cooperative = false, hatch = null, onTractCounties, watchCounties = false, compare, focus = null }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const applied = useRef<Partial<Record<GeoLevel, LevelPaint>>>({});
  const latest = useRef({ paint, theme, onViewChange, onHover, onSelect, onTilesError, levelZooms, featureLayer, onFeatureHover, onFeatureSelect, onUserMove, boundaries, featureFilter, hatch, onTractCounties, watchCounties, focus });
  // Refresh after every render, before any effect or event handler reads it.
  useLayoutEffect(() => { latest.current = { paint, theme, onViewChange, onHover, onSelect, onTilesError, levelZooms, featureLayer, onFeatureHover, onFeatureSelect, onUserMove, boundaries, featureFilter, hatch, onTractCounties, watchCounties, focus }; });
  /** Hatch filters currently on the map, per level (by set identity). */
  const appliedHatch = useRef<Partial<Record<GeoLevel, ReadonlySet<string> | undefined>>>({});
  /** Last county list reported to onTractCounties. */
  const reportedCounties = useRef("");
  /** Boundary vintage the county/tract sources currently point at. */
  const shownBoundaries = useRef<string | null>(null);
  /** True once our sources/layers exist on the current style. isStyleLoaded() can't be used:
   *  it stays false while tiles are loading, which silently dropped paint updates. */
  const ready = useRef(false);
  const hovered = useRef<{ level: GeoLevel; id: string } | null>(null);
  const selected = useRef<Flag>(compare ? { level: compare.level, id: compare.a } : null);
  const second = useRef<Flag>(compare ? { level: compare.level, id: compare.b } : null);
  const area = useRef<Geometry | null>(null);
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
      ...(compare ? { bounds: compare.bbox, fitBoundsOptions: { padding: 40 } }
        : initialView.fit ? { bounds: CONUS, fitBoundsOptions: { padding: 16 } } : { center: [initialView.lon, initialView.lat] as [number, number], zoom: initialView.zoom }),
      attributionControl: false,
      fadeDuration: reduceMotion ? 0 : MOTION.fade,
      dragRotate: false,
      pitchWithRotate: false,
      cooperativeGestures: cooperative,
    });
    map.current = m;
    // ?debug (or window.__wgDebug, set by the e2e init script so reloads keep it) exposes the map for devtools / headless checks.
    if ((window as unknown as { __wgDebug?: boolean }).__wgDebug || new URLSearchParams(window.location.search).has("debug")) (window as unknown as { __wgMap: MlMap }).__wgMap = (container.current as unknown as { __wgMap: MlMap }).__wgMap = m;
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
      isMoving: () => m.isMoving(),
      showArea: (shape) => { area.current = shape; if (ready.current) applyArea(m, shape, latest.current.theme); },
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

    m.on("style.load", () => {
      addHatchImage(m, latest.current.theme);
      addThematic(m, latest.current.theme, latest.current.boundaries);
      shownBoundaries.current = latest.current.boundaries;
      applyBands(m, latest.current.levelZooms);
      ready.current = true;
      applied.current = {};
      syncPaint(m, latest.current.paint, applied.current, latest.current.theme);
      syncFeatureLayer(m, latest.current.featureLayer ?? null, latest.current.theme);
      applyFeatureFilter(m, latest.current.featureLayer ?? null, latest.current.featureFilter);
      restoreFlags(m, hovered.current, selected.current, second.current);
      appliedHatch.current = {};
      syncHatch(m, latest.current.hatch, appliedHatch.current, latest.current.levelZooms);
      applyFocus(m, latest.current.focus, latest.current.theme);
      applyArea(m, area.current, latest.current.theme);
    });
    // The opening bbox is an estimate from the place's center and area; frame it exactly once its tiles are in.
    if (compare) m.once("idle", () => {
      const b = geographyBbox(m, compare.level, compare[compare.fit]);
      if (b) fitBbox(b, { top: 40, right: 40, bottom: 40, left: 40 });
    });
    // Hatching on: report which counties' tracts are on screen once the map settles.
    m.on("idle", () => reportTractCounties(m, !!latest.current.hatch || latest.current.watchCounties, latest.current.onTractCounties, reportedCounties));
    m.on("moveend", () => {
      const c = m.getCenter();
      latest.current.onViewChange({ lon: c.lng, lat: c.lat, zoom: m.getZoom() });
    });
    // A fitted first view (no `at` in the URL) fires no moveend: report the zoom it landed on, so
    // the level shown in the card and dock matches the map (phones fit the country near z2, desktops
    // near z4). Still `fit`, so the URL stays clean.
    if (initialView.fit) {
      const c = m.getCenter();
      latest.current.onViewChange({ lon: c.lng, lat: c.lat, zoom: m.getZoom(), fit: true });
    }
    // Only our sources count: a basemap tile blip isn't "boundary tiles missing". The message clears
    // once every source that failed has loaded a tile again.
    const failed = new Set<string>();
    const ours = (id: unknown): id is string => typeof id === "string" && (id.startsWith("b-") || id === FEATURE_SRC);
    m.on("error", (e) => {
      const id = (e as { sourceId?: unknown }).sourceId;
      if (!ours(id)) return;
      failed.add(id);
      latest.current.onTilesError?.(String(e.error?.message ?? e.error ?? ""));
    });
    m.on("data", (e) => {
      if (!failed.size || e.dataType !== "source" || !("tile" in e) || !e.tile) return;
      failed.delete(e.sourceId);
      // A source taken off the map (the feature layer after switching maps) won't load again.
      for (const id of failed) if (!m.getSource(id)) failed.delete(id);
      if (!failed.size) latest.current.onTilesError?.(null);
    });

    const fillIds = LEVELS.map((l) => `${l}-fill`);
    const infoOf = (f: MapGeoJSONFeature, x: number, y: number): HoverInfo => ({
      geoid: String(f.properties.geoid), name: f.properties.name ? String(f.properties.name) : blockName(String(f.properties.geoid)),
      level: f.sourceLayer as GeoLevel, x, y, props: f.properties,
    });
    /** The place under the pointer at the level being drawn. queryRenderedFeatures reports a fill layer
     *  outside its zoom band too (a county under a state at national zoom), so keep only levels whose
     *  band holds the current zoom. */
    const placeAt = (pt: { x: number; y: number }): MapGeoJSONFeature | undefined => {
      const z = m.getZoom();
      const bands = latest.current.levelZooms;
      const focused = latest.current.focus;
      // "Compare with…" is waiting for a second place: the places around the focused one count too.
      const picking = !!focused && comparePickOpen();
      return m.queryRenderedFeatures(pt as never, { layers: fillIds.filter((id) => m.getLayer(id)) }).find((f) => {
        // Focused: only the places inside it (its child level is filtered to them).
        if (focused && f.sourceLayer !== focused.child && !(picking && f.sourceLayer === focused.level)) return false;
        const band = bands ? bands[f.sourceLayer as GeoLevel] : GEO_LEVELS[f.sourceLayer as GeoLevel];
        return !!band && z >= band.minzoom && z < band.maxzoom;
      });
    };
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
      if (compare) return;
      if (latest.current.featureLayer) {
        const hit = featureAt(e.point);
        m.getCanvas().style.cursor = hit ? "pointer" : "";
        latest.current.onFeatureHover?.(hit);
        return;
      }
      const f = placeAt(e.point);
      setFlag(m, hovered, f ? { level: f.sourceLayer as GeoLevel, id: String(f.properties.geoid) } : null, "hover");
      m.getCanvas().style.cursor = f ? "pointer" : "";
      latest.current.onHover(f ? infoOf(f, e.point.x, e.point.y) : null);
    });
    m.on("mouseout", () => { setFlag(m, hovered, null, "hover"); latest.current.onHover(null); latest.current.onFeatureHover?.(null); });
    m.on("click", (e) => {
      if (compare) return;
      if (latest.current.featureLayer) { latest.current.onFeatureSelect?.(featureAt(e.point)); return; }
      const f = placeAt(e.point);
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
  // The canvas label follows the map shown, so screen readers hear the current one.
  useEffect(() => { map.current?.getCanvas().setAttribute("aria-label", ariaLabel); }, [ariaLabel]);

  // Zoom bands: depend on which levels the shown dataset(s) have.
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) { applyBands(m, levelZooms); syncHatch(m, latest.current.hatch, appliedHatch.current, levelZooms); }
  }, [levelZooms]);

  // Reliability hatching: filters and visibility; turning it on reports the counties in view now.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    syncHatch(m, hatch, appliedHatch.current, latest.current.levelZooms);
    if (!hatch && !watchCounties) reportedCounties.current = "";
    else reportTractCounties(m, true, latest.current.onTractCounties, reportedCounties);
  }, [hatch, watchCounties]);

  // Boundary vintage (timeline stops before 2020): swap the county/tract sources, keep the layers.
  // Runs before the paint effect, which then repaints the new sources.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current || shownBoundaries.current === boundaries) return;
    swapBoundaries(m, boundaries);
    shownBoundaries.current = boundaries;
    delete applied.current.county; delete applied.current.tract;
    syncPaint(m, latest.current.paint, applied.current, latest.current.theme);
    restoreFlags(m, hovered.current, selected.current, second.current);
  }, [boundaries]);

  // Paint: diff per level and push class indices into feature state.
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) { syncPaint(m, paint, applied.current, latest.current.theme); restoreFlags(m, hovered.current, selected.current, second.current); }
  }, [paint]);

  // Drill-down focus: filters and the dim wash.
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) applyFocus(m, latest.current.focus, latest.current.theme);
  }, [focus?.geoid, focus?.child]);

  // Feature layer (lines/points): swap in/out, then apply its filter.
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) { syncFeatureLayer(m, featureLayer ?? null, latest.current.theme); applyFeatureFilter(m, featureLayer ?? null, latest.current.featureFilter); }
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
    // The hatch layer follows the band too; whether it shows at all is syncHatch's call.
    if (band && m.getLayer(hatchLayerId(level))) m.setLayerZoomRange(hatchLayerId(level), band.minzoom, band.maxzoom);
    for (const id of [...fillLayerIds(level), `${level}-outline`]) {
      if (!m.getLayer(id)) continue;
      m.setLayoutProperty(id, "visibility", band ? "visible" : "none");
      if (band) m.setLayerZoomRange(id, band.minzoom, band.maxzoom);
    }
    for (const id of [`${level}-highlight-halo`, `${level}-highlight`, `${level}-highlight-second`]) {
      if (!m.getLayer(id)) continue;
      // Block groups and blocks are never picked from the table or search, and an always-on
      // outline would load their heavy tiles at every zoom (D-124): only within their band.
      if (STATIC_ONLY_LEVELS.has(level)) {
        m.setLayoutProperty(id, "visibility", band ? "visible" : "none");
        if (band) m.setLayerZoomRange(id, band.minzoom, band.maxzoom);
      } else m.setLayerZoomRange(id, 0, 24);
    }
  }
}

/** Drill-down (issue #203): the child level only inside the focused place, and the wash over the rest
 *  of the place's level, under the selection outlines (re-added per style and per focus). */
function applyFocus(m: MlMap, focus: Focus | null | undefined, theme: ThemeName) {
  for (const level of LEVELS) {
    for (const [id, f] of Object.entries(focusFilters(level, level === focus?.child ? focus.geoid : null))) if (m.getLayer(id)) m.setFilter(id, f as never);
  }
  if (m.getLayer(FOCUS_DIM_LAYER)) m.removeLayer(FOCUS_DIM_LAYER);
  const before = "state-highlight-halo";
  if (focus) m.addLayer(focusDimLayer(`b-${focus.level}`, focus.level, focus.geoid, theme), m.getLayer(before) ? before : undefined);
}

/** The hatch pattern for this theme, sharp at the screen's pixel density (re-added per style). */
function addHatchImage(m: MlMap, theme: ThemeName) {
  const ratio = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)));
  if (m.hasImage(HATCH_IMAGE)) m.removeImage(HATCH_IMAGE);
  m.addImage(HATCH_IMAGE, hatchImage(theme, ratio), { pixelRatio: ratio });
}

/** Show the hatch over each level's unreliable areas while hatching is on and the level has a band. */
function syncHatch(m: MlMap, hatch: Props["hatch"], applied: Partial<Record<GeoLevel, ReadonlySet<string> | undefined>>, bands: Props["levelZooms"]) {
  for (const level of LEVELS) {
    if (!HATCH_LEVELS.has(level)) continue;
    const id = hatchLayerId(level);
    if (!m.getLayer(id)) continue;
    const ids = hatch?.[level];
    const band = bands ? bands[level] : GEO_LEVELS[level];
    m.setLayoutProperty(id, "visibility", hatch && band && ids?.size ? "visible" : "none");
    if (applied[level] === ids) continue;
    m.setFilter(id, (ids?.size ? membershipFilter(ids) : NO_FEATURES) as never);
    applied[level] = ids;
  }
}

/** Counties (5-digit FIPS) whose tracts are drawn on screen; reported only when `on` (hatching or
 *  a change map) and the list changes. */
function reportTractCounties(m: MlMap, on: boolean, cb: Props["onTractCounties"], last: { current: string }) {
  if (!on || !cb || !m.getLayer("tract-fill")) return;
  const counties = new Set<string>();
  for (const f of m.queryRenderedFeatures({ layers: ["tract-fill"] })) counties.add(String(f.properties.geoid).slice(0, 5));
  const key = [...counties].sort().join(",");
  if (!key || key === last.current) return;
  last.current = key;
  cb(key.split(","));
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

function geometryBbox(g: Geometry): Bbox | undefined {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const walk = (c: unknown): void => {
    if (typeof (c as number[])[0] === "number") {
      const [lon, y] = c as number[];
      const x = lon > 0 ? lon - 360 : lon; // U.S. places are all west of 0°: the Aleutians past 180° stay next to Alaska
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
  for (const level of LEVELS) for (const id of [`${level}-highlight-halo`, `${level}-highlight`, `${level}-highlight-second`]) {
    if (m.getLayer(id)) m.moveLayer(id, m.getLayer(DATA_BEFORE_ID) ? DATA_BEFORE_ID : undefined);
  }
}

/** The searched area's outline: a GeoJSON source with the selection outline, above every fill. */
function applyArea(m: MlMap, shape: Geometry | null, theme: ThemeName) {
  const layers = areaHighlightLayers(theme);
  for (const l of layers) if (m.getLayer(l.id)) m.removeLayer(l.id);
  if (m.getSource(AREA_SOURCE)) m.removeSource(AREA_SOURCE);
  if (!shape) return;
  m.addSource(AREA_SOURCE, { type: "geojson", data: shape });
  for (const l of layers) m.addLayer(l, m.getLayer(DATA_BEFORE_ID) ? DATA_BEFORE_ID : undefined);
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
    if (TILE_VALUE_LEVELS.has(level)) {
      // Values are tile properties: one step expression, no per-feature state.
      const noData = THEMES[theme].map.noData;
      const expr = next?.field && next.breaks
        ? ["case", ["has", next.field], ["step", ["get", next.field], next.colors[0], ...next.breaks.flatMap((b, i) => [b, next.colors[i + 1]])], noData]
        : noData;
      m.setPaintProperty(`${level}-fill`, "fill-color", expr as never);
      applied[level] = next;
      continue;
    }
    // Data-driven expressions evaluated in the tile workers, no per-feature state (D-114).
    if (PER_STATE_LEVELS.has(level)) {
      const fills = choroplethFillsByState(level, next?.colors ?? [], next?.classes ?? new Map(), theme, next?.noData, next?.packed);
      for (const [id, color] of Object.entries(fills)) if (m.getLayer(id)) m.setPaintProperty(id, "fill-color", color as never);
    } else {
      m.setPaintProperty(`${level}-fill`, "fill-color", choroplethFill(next?.colors ?? [], next?.classes ?? new Map(), theme, next?.noData) as never);
    }
    applied[level] = next;
  }
}

/** Blocks carry no names in the tiles (8 million of them): "Block 1001, Tract 101.02". */
function blockName(geoid: string) {
  return `Block ${geoid.slice(11)}, Tract ${Number(geoid.slice(5, 11)) / 100}`;
}

type Flag = { level: GeoLevel; id: string } | null;

/** Repainting clears feature state per source; put the hover/selection flags back. */
function restoreFlags(m: MlMap, hover: Flag, sel: Flag, second: Flag) {
  for (const [f, key] of [[hover, "hover"], [sel, "selected"], [second, "second"]] as const) {
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
  m.addSource(FEATURE_SRC, { type: "vector", url: pmtilesUrl(spec.tiles) });
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
