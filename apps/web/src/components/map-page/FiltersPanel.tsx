"use client";
// Filters (issue #34, Robbie 2026-10-02): everything that was "Display options" (geography level,
// facet filters) plus the year control, behind one small filter button under the dataset name.
// Phones: the panel grows from the button to full screen; changes are staged and Apply shrinks it
// back into the button. Desktop: a sidebar that opens over the left of the map (not a fixed
// column), with changes applied live.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Info, ListFilter, X } from "lucide-react";
import { GEO_LEVELS, type GeoLevel } from "@webgis/design";
import type { Facet } from "@webgis/registry";
import { TERM_BY_ID } from "@/lib/glossary";
import type { Stop } from "@/lib/periods";
import { TimeControl } from "../TimeControl";

/** What the filters control. `hidden`: facet field → values the visitor hid. */
export interface FilterValue {
  pinned: GeoLevel | null;
  /** Timeline stop id; null = the default period. */
  stop: string | null;
  hidden: Record<string, Set<string>>;
}

/** Changes from the defaults, for the button's count: each hidden value, a pinned level, a year. */
export function filterCount(v: FilterValue): number {
  return Object.values(v.hidden).reduce((a, h) => a + h.size, 0) + (v.pinned ? 1 : 0) + (v.stop ? 1 : 0);
}

/** "Road type" → "road types", "Functional class" → "functional classes". */
export const pluralLabel = (label: string) => {
  const l = label.toLowerCase();
  return /(s|x|ch|sh)$/.test(l) ? `${l}es` : `${l}s`;
};

/** The small filter button under the dataset name, with a count when filters are set. */
export function FilterButton({ count, open, onOpen, className = "" }: { count: number; open: boolean; onOpen: (el: HTMLElement) => void; className?: string }) {
  return (
    <button type="button" data-filter-button="" onClick={(e) => onOpen(e.currentTarget)} aria-expanded={open} aria-controls="filters-panel"
      aria-label={count ? `Filters, ${count} set` : "Filters"}
      className={`wg-panel pointer-events-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring ${className}`}>
      <ListFilter className="size-3.5" aria-hidden />
      Filters
      {count > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none text-primary-foreground tabular-nums">{count}</span>}
    </button>
  );
}

interface ControlsProps {
  levels: GeoLevel[];
  /** The level drawn now (switching with zoom). */
  shown: GeoLevel;
  facets: Facet[];
  stops: Stop[];
  value: FilterValue;
  onChange: (v: FilterValue) => void;
}

const sectionTitle = "text-xs font-semibold";

/** The panel's sections: year, geography level, then each facet as a checkbox list. */
function FilterControls({ levels, shown, facets, stops, value, onChange }: ControlsProps) {
  const plural = (l: GeoLevel) => GEO_LEVELS[l].plural.toLowerCase();
  const defaultStop = stops.find((s) => s.isDefault)?.id;
  return (
    <div className="space-y-5">
      {stops.length > 0 && defaultStop && (
        <section aria-label="Year">
          <TimeControl stops={stops} value={value.stop ?? defaultStop} onChange={(id) => onChange({ ...value, stop: id === defaultStop ? null : id })} />
        </section>
      )}
      {levels.length > 1 && (
        <fieldset>
          <legend className={sectionTitle}>Geography level</legend>
          <div role="radiogroup" aria-label="Geography level" className="mt-1.5 space-y-0.5">
            {([null, ...levels] as Array<GeoLevel | null>).map((l) => {
              const on = value.pinned === l;
              return (
                <label key={l ?? "auto"} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted/60">
                  <input type="radio" name="geo-level" checked={on} onChange={() => onChange({ ...value, pinned: l })} className="size-4 accent-[var(--ui-accent)]" />
                  <span className="flex-1">{l ? GEO_LEVELS[l].plural : "Switch with zoom"}</span>
                  {l === null && <span className="text-xs text-muted-foreground">{plural(shown)} now</span>}
                  {l && l === shown && value.pinned === null && <span className="text-xs text-muted-foreground">shown now</span>}
                </label>
              );
            })}
          </div>
          {value.pinned && "pinFloor" in GEO_LEVELS[value.pinned] && (
            <p className="mt-1 px-1.5 text-xs text-muted-foreground">{GEO_LEVELS[value.pinned].plural} show once you zoom in closer than a few states.</p>
          )}
        </fieldset>
      )}
      {facets.map((f) => <FacetChecks key={f.field} facet={f} hidden={value.hidden[f.field]}
        onChange={(h) => onChange({ ...value, hidden: { ...value.hidden, [f.field]: h } })} />)}
    </div>
  );
}

/** One facet as a checkbox list (checked = shown), with its explainer behind an info button. */
function FacetChecks({ facet, hidden, onChange }: { facet: Facet; hidden?: Set<string>; onChange: (h: Set<string>) => void }) {
  const [explain, setExplain] = useState(false);
  const term = facet.term ? TERM_BY_ID.get(facet.term) : undefined;
  const toggle = (v: string) => { const n = new Set(hidden ?? []); if (n.has(v)) n.delete(v); else n.add(v); onChange(n); };
  return (
    <fieldset>
      <div className="flex items-center gap-1.5">
        <legend className={sectionTitle}>{facet.label}</legend>
        <button type="button" onClick={() => setExplain((e) => !e)} aria-expanded={explain} aria-label={`What is ${facet.label.toLowerCase()}?`}
          className="rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-3.5" aria-hidden /></button>
        {hidden && hidden.size > 0 && <button type="button" onClick={() => onChange(new Set())} className="ml-auto rounded text-xs font-semibold text-primary hover:underline">Show all</button>}
      </div>
      {explain && (
        <div className="mt-1.5 rounded-md bg-muted p-2 text-xs leading-snug">
          <p>{facet.explainer}</p>
          {term && <p className="mt-1 text-muted-foreground">{term.short}</p>}
        </div>
      )}
      <div className="mt-1.5 space-y-0.5">
        {facet.values.map((v) => {
          const on = !hidden?.has(String(v.value));
          return (
            <label key={String(v.value)} className="flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted/60">
              <input type="checkbox" checked={on} onChange={() => toggle(String(v.value))} className="mt-0.5 size-4 shrink-0 accent-[var(--ui-accent)]" />
              <span className={on ? "" : "text-muted-foreground"}>{v.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const GROW_MS = 320;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** `inset()` that clips the full-screen panel down to an element's box. */
function insetOf(el: HTMLElement | null) {
  const r = el?.getBoundingClientRect();
  if (!r) return "inset(50% 50% 50% 50% round 14px)";
  return `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round 14px)`;
}

/** Phones: full screen, grown from the filter button; changes are staged until Apply. */
export function FiltersSheet({ anchor, title, value, onApply, onClose, ...controls }: Omit<ControlsProps, "value" | "onChange"> & {
  anchor: HTMLElement | null;
  title: string;
  value: FilterValue;
  onApply: (v: FilterValue) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [phase, setPhase] = useState<"from" | "open" | "closing">("from");
  const [clip, setClip] = useState(() => insetOf(anchor));
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPhase("open")));
    return () => cancelAnimationFrame(id);
  }, []);
  /** Shrink back into the button, then unmount. */
  const finish = (apply: boolean) => {
    if (apply) onApply(draft);
    // Re-read the button: it may have moved (a count appeared).
    setClip(insetOf(document.querySelector<HTMLElement>("[data-filter-button]:not([inert] *)") ?? anchor));
    setPhase("closing");
    window.setTimeout(onClose, reduced() ? 0 : growMs() + 20);
  };
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); finish(false); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  });
  const n = filterCount(draft);
  const style: CSSProperties = {
    clipPath: phase === "open" ? "inset(0 0 0 0 round 0px)" : clip,
    transition: `clip-path var(--wg-grow-ms, ${GROW_MS}ms) cubic-bezier(0.2, 0.8, 0.2, 1)`,
  };
  return (
    <div id="filters-panel" role="dialog" aria-modal="true" aria-label={`Filters for ${title}`} style={style}
      className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className={`flex min-h-0 flex-1 flex-col transition-opacity ${phase === "open" ? "opacity-100 duration-200" : "opacity-0 duration-100"}`}>
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <ListFilter className="size-5 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-tight">Filters</h2>
            <p className="truncate text-xs text-muted-foreground">{title}</p>
          </div>
          <button type="button" onClick={() => finish(false)} aria-label="Close filters without applying"
            className="-mr-1 rounded p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <FilterControls {...controls} value={draft} onChange={setDraft} />
        </div>
        <footer className="flex items-center gap-3 border-t bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <button type="button" onClick={() => setDraft({ pinned: null, stop: null, hidden: {} })} disabled={n === 0}
            className="rounded-md px-3 py-2.5 text-sm font-semibold text-primary disabled:text-muted-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-ring">Reset</button>
          <button type="button" onClick={() => finish(true)}
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring">
            Apply filters{n > 0 ? ` (${n})` : ""}
          </button>
        </footer>
      </div>
    </div>
  );
}
const growMs = () => {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--wg-grow-ms").trim();
  return v ? parseFloat(v) : GROW_MS;
};

/** Desktop: a sidebar over the left of the map, between the title and the legend strip.
 *  Changes apply live. A solid panel, like every other control over the map. */
export function FiltersSidebar({ top, bottom, value, onChange, onClose, hiddenWhileMoving, ...controls }: ControlsProps & {
  top: number;
  bottom: number;
  onClose: () => void;
  /** Smaller screens: the sidebar steps aside while the map moves. */
  hiddenWhileMoving: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [onClose]);
  const n = filterCount(value);
  return (
    <section ref={ref} id="filters-panel" aria-label="Filters" data-obstructs={hiddenWhileMoving ? undefined : ""}
      className={`wg-panel absolute left-3 z-30 flex w-80 flex-col overflow-hidden rounded-xl transition-opacity duration-200 md:left-4 ${hiddenWhileMoving ? "pointer-events-none opacity-0" : "opacity-100"}`}
      style={{ top, maxHeight: `calc(100% - ${top + bottom}px)` }}>
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <ListFilter className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="flex-1 text-sm font-semibold">Filters</h2>
        {n > 0 && <button type="button" onClick={() => onChange({ pinned: null, stop: null, hidden: {} })} className="rounded text-xs font-semibold text-primary hover:underline">Reset</button>}
        <button type="button" onClick={onClose} aria-label="Close filters" className="-mr-1.5 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <FilterControls {...controls} value={value} onChange={onChange} />
      </div>
    </section>
  );
}
