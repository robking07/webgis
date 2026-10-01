// Everything needed to reproduce a view lives in the URL:
//   ?d=<dataset>&b=<second dataset for bivariate>&at=<lon>,<lat>,<zoom>&theme=light|dark
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

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
   *  null = the dataset's default (how the source publishes it; D-33). */
  lv: "state" | "county" | "tract" | "auto" | null;
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
    lv: (["state", "county", "tract", "auto"] as const).find((l) => l === p.get("lv")) ?? null,
  };
}

export function serializeUrlState(s: UrlState): string {
  const p = new URLSearchParams();
  if (s.d) p.set("d", s.d);
  if (s.b) p.set("b", s.b);
  if (!s.at.fit) p.set("at", `${s.at.lon.toFixed(4)},${s.at.lat.toFixed(4)},${s.at.zoom.toFixed(2)}`);
  if (s.theme) p.set("theme", s.theme);
  if (s.lv) p.set("lv", s.lv);
  return `?${p.toString().replaceAll("%2C", ",")}`;
}

/** URL-backed state. Writes use replaceState (debounced) so panning doesn't flood history. */
export function useUrlState(initial: UrlState) {
  const [state, setState] = useState<UrlState>(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => window.history.replaceState(null, "", serializeUrlState(state)), 250);
    return () => clearTimeout(timer.current);
  }, [state]);
  const update = useCallback((patch: Partial<UrlState>) => setState((s) => ({ ...s, ...patch })), []);
  return [state, update] as const;
}
