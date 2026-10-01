"use client";
// Theme choice. An explicit choice (?theme= or the toggle) is remembered in this browser so it
// carries across pages; with no choice the site follows the system setting. The root layout's
// inline script applies it before first paint (see app/layout.tsx; keep THEME_KEY in sync).
import { useEffect, useState } from "react";
import type { ThemeName } from "@webgis/design";

export const THEME_KEY = "mapwich-theme";

export function readStoredTheme(): ThemeName | null {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch { return null; }
}

function storeTheme(t: ThemeName) {
  try { localStorage.setItem(THEME_KEY, t); } catch { /* private mode: the choice lasts this page only */ }
}

/** Apply an explicit theme to the document (and remember it), or follow the system when null. */
export function useResolvedTheme(explicit: ThemeName | null): ThemeName {
  const [system, setSystem] = useState<ThemeName>("light");
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const set = () => setSystem(mq.matches ? "dark" : "light");
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  useEffect(() => {
    if (explicit) { document.documentElement.dataset.theme = explicit; storeTheme(explicit); }
    else delete document.documentElement.dataset.theme;
  }, [explicit]);
  return explicit ?? system;
}
