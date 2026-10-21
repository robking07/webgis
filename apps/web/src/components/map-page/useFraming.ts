import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { GeoLevel } from "@webgis/design";
import type { Camera, FeatureHit, HoverInfo, MapApi, Padding } from "../map/MapView";
import type { Dataset } from "@/lib/registry";
import { comparePickOpen } from "@/lib/compare";
import { levelOfGeoid, tidyPlaceName } from "@/lib/place";
import { loadPlaceIndex, placeByGeoid, zoomForArea } from "@/lib/search";

export type PlaceTarget = { geoid: string | null; level: GeoLevel | null; name: string; lon: number; lat: number; sqmi?: number };

/** One drill-down step: the place clicked into, and the view to go back to when leaving it. */
type Step = { geoid: string; name: string; before: Camera | null };

/** A focused place's name when only its GEOID is known (a shared link, browser Forward). */
async function nameOf(geoid: string): Promise<string> {
  const level = levelOfGeoid(geoid);
  if (level === "tract") return `Census tract ${Number(geoid.slice(5)) / 100}`;
  if (level === "block_group") return `Block group ${geoid.slice(11)}`;
  const hit = await loadPlaceIndex().then((rows) => placeByGeoid(rows, geoid), () => null);
  return hit?.name ?? geoid;
}

/** Framing (D-35): zoom to what's clicked or picked, clear of open panels, with a way back.
 *  Drill-down (issue #203): a click on a place with a finer level focuses it (`focus`, the URL's
 *  `in`); Back, the details' trail and browser Back go up one step, back to the view before it. */
export function useFraming({ mapApi, setSelected, setFeatureSelected, isFeature, primary, tableOpen, narrow, focus, setFocus, childOf }: {
  mapApi: RefObject<MapApi | null>;
  setSelected: Dispatch<SetStateAction<HoverInfo | null>>;
  setFeatureSelected: Dispatch<SetStateAction<FeatureHit | null>>;
  isFeature: boolean;
  primary: Dataset | null;
  tableOpen: boolean;
  narrow: boolean;
  /** The focused place's GEOID (the URL's `in`), null for the whole map. */
  focus: string | null;
  setFocus: (geoid: string | null) => void;
  /** The level a click on this level drills into, or null at the map's finest level. */
  childOf: (level: GeoLevel) => GeoLevel | null;
}) {
  const root = useRef<HTMLDivElement>(null);
  /** Views to return to: pushed when a click on the map moves to a feature (D-35). */
  const history = useRef<Camera[]>([]);
  const [canGoBack, setCanGoBack] = useState(false);
  /** The places clicked into, outermost first; the last is the focused one. */
  const trail = useRef<Step[]>([]);
  const [focusName, setFocusName] = useState<string | null>(null);
  const showTrail = useCallback(() => setFocusName(trail.current.at(-1)?.name.split(",")[0] ?? null), []);

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

  /** Up to `geoid` (a place in the trail) or out of focus (null): back to the view before the step below it. */
  const leaveTo = useCallback((geoid: string | null) => {
    const t = trail.current;
    const i = geoid ? t.findIndex((s) => s.geoid === geoid) : -1;
    const view = t[i + 1]?.before;
    t.length = i + 1;
    if (view) mapApi.current?.setCamera(view);
    showTrail();
    setFocus(geoid);
  }, [mapApi, setFocus, showTrail]);

  // Browser Back/Forward (and a shared link) change the focus without a click: follow the URL.
  useEffect(() => {
    const t = trail.current;
    if ((t.at(-1)?.geoid ?? null) === focus) return;
    if (!focus || t.some((s) => s.geoid === focus)) { leaveTo(focus); return; }
    const api = mapApi.current, level = levelOfGeoid(focus);
    const step: Step = { geoid: focus, name: "", before: api?.getCamera() ?? null };
    t.push(step);
    // A shared link opens on its own view; Forward frames the place if its shape is loaded.
    if (api && level) api.fitGeography(level, focus, clearArea());
    let live = true;
    nameOf(focus).then((n) => { step.name = tidyPlaceName(n); if (live) showTrail(); });
    return () => { live = false; };
  }, [focus, leaveTo, mapApi, clearArea, showTrail]);

  const goBack = () => {
    setSelected(null); setFeatureSelected(null);
    mapApi.current?.select("county", null);
    // shortcut: a shared focused link has a one-step trail, so Back leaves focus instead of going to the parent; derive the parent from the GEOID if that's missed.
    if (focus) { leaveTo(trail.current.at(-2)?.geoid ?? null); return; }
    const c = history.current.pop();
    if (c) mapApi.current?.setCamera(c);
    setCanGoBack(history.current.length > 0);
  };
  /** A click on the map: select it and center it at the same zoom; a double click (`fit`) frames it
   *  whole (issue #317). A place with a finer level is focused (its parts drawn inside it); outside a
   *  focused place the move gets a way back. */
  const onMapSelect = useCallback((h: HoverInfo | null, fit = false) => {
    // Picking a place to compare: only select it (CompareWith opens the comparison); a drill would
    // write the URL and cancel that navigation.
    const picking = comparePickOpen();
    setSelected(h);
    const api = mapApi.current;
    if (!h || !api || picking) return;
    const before = api.getCamera();
    const move = () => api.fitGeography(h.level, h.geoid, clearArea(true), !fit);
    // The double click's first click already focused it (the trail holds the view before).
    if (childOf(h.level) && trail.current.at(-1)?.geoid !== h.geoid) {
      trail.current.push({ geoid: h.geoid, name: tidyPlaceName(h.name), before });
      move();
      showTrail();
      setFocus(h.geoid);
      return;
    }
    // A double click's first click already saved the way back.
    if (fit || focus) { move(); return; }
    if (move()) { history.current.push(before); setCanGoBack(true); }
  }, [clearArea, mapApi, setSelected, childOf, focus, setFocus, showTrail]);
  const onFeatureSelect = useCallback((hit: FeatureHit | null, fit = false) => {
    setFeatureSelected(hit);
    const api = mapApi.current;
    if (!hit?.bbox || !api) return;
    if (fit) { api.fitBbox(hit.bbox, clearArea(true), 14); return; }
    history.current.push(api.getCamera());
    setCanGoBack(true);
    api.centerBbox(hit.bbox, clearArea(true));
  }, [clearArea, mapApi, setFeatureSelected]);

  /** Fly to a place from the table, search or the details' trail, framed clear of open panels, and
   *  select it. A place in the trail goes back up to it; another place with a finer level starts a
   *  new focus there; anything else leaves focus. */
  const goToPlace = useCallback((p: PlaceTarget) => {
    const selectable = !!p.geoid && !!p.level && !isFeature && !!primary?.geographyLevels.includes(p.level);
    const select = () => {
      mapApi.current?.select(p.level!, p.geoid!);
      setSelected({ geoid: p.geoid!, name: p.name, level: p.level!, x: 0, y: 0, lon: p.lon, lat: p.lat });
    };
    if (selectable && trail.current.some((s) => s.geoid === p.geoid)) { leaveTo(p.geoid); select(); return; }
    const drill = selectable && !!childOf(p.level!);
    trail.current = drill ? [{ geoid: p.geoid!, name: tidyPlaceName(p.name), before: mapApi.current?.getCamera() ?? null }] : [];
    showTrail();
    setFocus(drill ? p.geoid : null);
    // Wait a frame so panels that just opened/closed are measured where they now are.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const pad = clearArea(selectable && !(tableOpen && narrow));
      const el = root.current;
      // Fit to the free part of the map (between panels), not the whole screen.
      const free = el && pad ? Math.min(el.clientWidth - pad.left - pad.right, el.clientHeight - pad.top - pad.bottom) : 1000;
      const zoom = p.sqmi != null ? zoomForArea(p.sqmi, free) : p.level === "state" ? 5.2 : 8.2;
      mapApi.current?.flyTo(p.lon, p.lat, zoom, pad);
    }));
    if (selectable) select();
  }, [clearArea, isFeature, primary, tableOpen, narrow, mapApi, setSelected, childOf, leaveTo, setFocus, showTrail]);

  const leaveFocus = useCallback(() => leaveTo(null), [leaveTo]);
  return { root, canGoBack: canGoBack || !!focus, goBack, onMapSelect, onFeatureSelect, goToPlace, focusName, leaveFocus, clearArea };
}
