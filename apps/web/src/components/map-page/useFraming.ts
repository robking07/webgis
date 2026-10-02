import { useCallback, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { GeoLevel } from "@webgis/design";
import type { Camera, FeatureHit, HoverInfo, MapApi, Padding } from "../map/MapView";
import type { Dataset } from "@/lib/registry";
import { zoomForArea } from "@/lib/search";

export type PlaceTarget = { geoid: string | null; level: GeoLevel | null; name: string; lon: number; lat: number; sqmi?: number };

/** Framing (D-35): zoom to what's clicked or picked, clear of open panels, with a way back. */
export function useFraming({ mapApi, setSelected, setFeatureSelected, isFeature, primary, tableOpen, narrow }: {
  mapApi: RefObject<MapApi | null>;
  setSelected: Dispatch<SetStateAction<HoverInfo | null>>;
  setFeatureSelected: Dispatch<SetStateAction<FeatureHit | null>>;
  isFeature: boolean;
  primary: Dataset | null;
  tableOpen: boolean;
  narrow: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  /** Views to return to: pushed only when a click on the map zooms to a feature (D-35). */
  const history = useRef<Camera[]>([]);
  const [canGoBack, setCanGoBack] = useState(false);

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
  }, [clearArea, mapApi, setSelected]);
  const onFeatureSelect = useCallback((hit: FeatureHit | null) => {
    setFeatureSelected(hit);
    const api = mapApi.current;
    if (!hit?.bbox || !api) return;
    history.current.push(api.getCamera());
    setCanGoBack(true);
    api.fitBbox(hit.bbox, clearArea(true), 14);
  }, [clearArea, mapApi, setFeatureSelected]);

  /** Fly to a place from the table or search, framed clear of open panels, and select it. */
  const goToPlace = useCallback((p: PlaceTarget) => {
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
  }, [clearArea, isFeature, primary, tableOpen, narrow, mapApi, setSelected]);

  return { root, canGoBack, goBack, onMapSelect, onFeatureSelect, goToPlace };
}
