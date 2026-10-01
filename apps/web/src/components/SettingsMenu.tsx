"use client";
// Header settings (D-33): theme and map units, out of the main navigation.
import { useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import type { ThemeName } from "@webgis/design";

export type ScaleUnit = "imperial" | "metric";

interface Props {
  theme: ThemeName | null;
  onTheme: (t: ThemeName | null) => void;
  unit: ScaleUnit;
  onUnit: (u: ScaleUnit) => void;
}

export function SettingsMenu({ theme, onTheme, unit, onUnit }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); window.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" aria-label="Settings"
        className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        <Settings className="size-[18px]" aria-hidden />
      </button>
      {open && (
        <div role="group" aria-label="Settings" className="absolute right-0 top-11 z-50 w-60 space-y-4 rounded-lg border bg-popover p-3 shadow-lg">
          <Choice label="Theme" value={theme ?? "system"} onChange={(v) => onTheme(v === "system" ? null : (v as ThemeName))}
            options={[["system", "System"], ["light", "Light"], ["dark", "Dark"]]} />
          <Choice label="Distances" value={unit} onChange={(v) => onUnit(v as ScaleUnit)}
            options={[["imperial", "Miles"], ["metric", "Kilometers"]]} />
        </div>
      )}
    </div>
  );
}

function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex rounded-md border p-0.5">
        {options.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
            className="flex-1 rounded px-2 py-1 text-xs text-muted-foreground aria-checked:bg-primary aria-checked:text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring">
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Per-viewer convenience: remembered in this browser only. */
export function useScaleUnit(): [ScaleUnit, (u: ScaleUnit) => void] {
  // Only the (client-only) scale bar reads this, so reading storage up front can't mismatch hydration.
  const [unit, setUnit] = useState<ScaleUnit>(() => {
    try { return typeof window !== "undefined" && localStorage.getItem("wg-units") === "metric" ? "metric" : "imperial"; } catch { return "imperial"; }
  });
  return [unit, (u) => { setUnit(u); try { localStorage.setItem("wg-units", u); } catch { /* storage blocked */ } }];
}
