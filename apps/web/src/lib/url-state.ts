// Everything needed to reproduce a view lives in the URL:
//   ?d=<dataset>&b=<second dataset for bivariate>&at=<lon>,<lat>,<zoom>&theme=light|dark
//   &lv=<level>&t=<timeline stop, e.g. 2019; omitted = the default period>
//   &since=<earlier stop: map the change from it to the shown stop (issue #127)>
//   &in=<geoid: the place clicked into, drawn with the next level inside it (issue #203)>
//   &mpo=<MPO id: a Metropolitan Planning Organization picked in search, outlined (issue #276)>
//   &area=<a city or metro area picked in search, by tagged code: place2743000, cbsa33460 (issue #332)>
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AREA_CODE } from "./search";

export interface ViewState {
  lon: number; lat: number; zoom: number;
  /** No `at` in the URL: frame the country to the screen instead of a fixed zoom. */
  fit?: boolean;
}
export interface UrlState {
  d: string | null;
  b: string | null;
  at: ViewState;
  theme: "light" | "dark" | null;
  /** Geography level ("Display options"): a fixed level, "auto" (switch with zoom), or
   *  null = the dataset's default (how the source publishes it; D-35). */
  lv: "state" | "county" | "tract" | "block_group" | "block" | "auto" | null;
  /** Timeline stop (D-36), e.g. "2019" (ACS 2015–2019) or "2021"; null = the default period. */
  t?: string | null;
  /** Change map: the earlier timeline stop the change is measured from; null = values, not change. */
  since?: string | null;
  /** Drill-down: the GEOID of the focused place; null = the whole map. */
  in?: string | null;
  /** A searched MPO (outlined, not a geography level); null = none. */
  mpo?: string | null;
  area?: string | null;
  /** `preview` also shows unapproved "Why this matters" drafts; kept in the URL as is. */
  context?: "preview" | null;
}

export const DEFAULT_VIEW: ViewState = { lon: -96.5, lat: 38.5, zoom: 3.6, fit: true };

export function parseUrlState(search: string): UrlState {
  const p = new URLSearchParams(search);
  const at = p.get("at")?.split(",").map(Number);
  const theme = p.get("theme");
  return {
    d: p.get("d"),
    b: p.get("b"),
    at: at && at.length === 3 && at.every(Number.isFinite) ? { lon: at[0], lat: at[1], zoom: at[2] } : DEFAULT_VIEW,
    theme: theme === "light" || theme === "dark" ? theme : null,
    lv: (["state", "county", "tract", "block_group", "block", "auto"] as const).find((l) => l === p.get("lv")) ?? null,
    t: p.get("t")?.match(/^[a-z0-9]{1,12}$/)?.[0] ?? null,
    since: p.get("since")?.match(/^[a-z0-9]{1,12}$/)?.[0] ?? null,
    in: p.get("in")?.match(/^\d{2,15}$/)?.[0] ?? null,
    mpo: p.get("mpo")?.match(/^\w{1,10}$/)?.[0] ?? null,
    area: p.get("area")?.match(AREA_CODE)?.[0] ?? null,
    context: p.get("context") === "preview" ? "preview" : null,
  };
}

export function serializeUrlState(s: UrlState): string {
  const p = new URLSearchParams();
  if (s.d) p.set("d", s.d);
  if (s.b) p.set("b", s.b);
  if (!s.at.fit) p.set("at", `${s.at.lon.toFixed(4)},${s.at.lat.toFixed(4)},${s.at.zoom.toFixed(2)}`);
  if (s.theme) p.set("theme", s.theme);
  if (s.lv) p.set("lv", s.lv);
  if (s.t) p.set("t", s.t);
  if (s.since) p.set("since", s.since);
  if (s.in) p.set("in", s.in);
  if (s.mpo) p.set("mpo", s.mpo);
  if (s.area) p.set("area", s.area);
  if (s.context) p.set("context", s.context);
  return `?${p.toString().replaceAll("%2C", ",")}`;
}

/** The deliberate choices; changing one adds a Back step (each drill-down step too). Panning, zooming and theme don't. */
export const historyKey = (s: UrlState) => [s.d, s.b, s.lv, s.t, s.since, s.in, s.mpo, s.area].join("|");

/** URL-backed state. Pan/zoom write with replaceState (debounced); a change to the dataset, second
 *  dataset, level, period or focused place pushes a history entry, and Back/Forward re-read the URL. */
export function useUrlState(initial: UrlState) {
  const [state, setState] = useState<UrlState>(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastKey = useRef(historyKey(initial));
  useEffect(() => {
    clearTimeout(timer.current);
    const key = historyKey(state);
    const push = key !== lastKey.current;
    lastKey.current = key;
    const write = () => window.history[push ? "pushState" : "replaceState"](null, "", serializeUrlState(state));
    if (push) write(); else timer.current = setTimeout(write, 250);
    return () => clearTimeout(timer.current);
  }, [state]);
  useEffect(() => {
    // shortcut: Back restores the dataset/level/period; the camera stays where the visitor left it.
    const onPop = () => {
      const p = parseUrlState(window.location.search);
      setState((s) => {
        const next = { ...s, d: p.d ?? initial.d, b: p.b, lv: p.lv, t: p.t, since: p.since, in: p.in, mpo: p.mpo, area: p.area };
        lastKey.current = historyKey(next); // the URL already holds it: don't push it again
        return next;
      });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [initial.d]);
  const update = useCallback((patch: Partial<UrlState>) => setState((s) => ({ ...s, ...patch })), []);
  return [state, update] as const;
}
