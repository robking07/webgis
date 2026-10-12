"use client";
// Map options (issue #34, Robbie 2026-10-02; renamed from "Filters", #155, 2026-10-10): geography
// level, time (year, or change since an earlier period) and facet show/hide, behind one small button
// under the dataset name.
// Phones: the panel grows from the button to full screen; changes are staged and Apply shrinks it
// back into the button. Desktop: a sidebar that opens over the left of the map (not a fixed
// column), with changes applied live.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Info, SlidersHorizontal, X } from "lucide-react";
import { GEO_LEVELS, type GeoLevel } from "@webgis/design";
import type { Facet } from "@webgis/registry";
import { TERM_BY_ID } from "@/lib/glossary";
import { changeEnds, changeStops, latestStop, type Stop } from "@/lib/periods";
import { TimeControl } from "../TimeControl";

/** What the filters control. `hidden`: facet field → values the visitor hid. */
export interface FilterValue {
  pinned: GeoLevel | null;
  /** Timeline stop id; null = the default period. */
  stop: string | null;
  /** Change map (issue #127): the earlier stop the change is measured from; null = values. */
  since: string | null;
  hidden: Record<string, Set<string>>;
}

/** Changes from the defaults (each hidden value, a pinned level, a year, a change map): the button's dot and Reset. */
export function filterCount(v: FilterValue): number {
  return Object.values(v.hidden).reduce((a, h) => a + h.size, 0) + (v.pinned ? 1 : 0) + (v.stop ? 1 : 0) + (v.since ? 1 : 0);
}

const NO_FILTERS: FilterValue = { pinned: null, stop: null, since: null, hidden: {} };

/** "Road type" → "road types", "Functional class" → "functional classes". */
export const pluralLabel = (label: string) => {
  const l = label.toLowerCase();
  return /(s|x|ch|sh)$/.test(l) ? `${l}es` : `${l}s`;
};

/** The small "Map options" button under the dataset name, with a dot when anything differs from
 *  the defaults (a count read as "how many", and hiding 5 road types counted 5; Robbie, 2026-10-10). */
export function FilterButton({ count, open, onOpen, className = "" }: { count: number; open: boolean; onOpen: (el: HTMLElement) => void; className?: string }) {
  return (
    <button type="button" data-filter-button="" onClick={(e) => onOpen(e.currentTarget)} aria-expanded={open} aria-controls="filters-panel"
      aria-label={count ? "Map options, changed from the defaults" : "Map options"}
      className={`wg-panel pointer-events-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring ${className}`}>
      <SlidersHorizontal className="size-3.5" aria-hidden />
      Map options
      {count > 0 && <span data-changed-dot="" className="size-2 rounded-full bg-primary" aria-hidden />}
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

/** A headed section of the panel (Robbie, 2026-10-10, D-252): Geography, Time, Show/hide. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** The panel's sections: geography level, time (values for one period, or the change since an
 *  earlier one), then each facet as a checkbox list. */
function FilterControls({ levels, shown, facets, stops, value, onChange }: ControlsProps) {
  const plural = (l: GeoLevel) => GEO_LEVELS[l].plural.toLowerCase();
  const defaultStop = stops.find((s) => s.isDefault)?.id;
  // Values / Change (Robbie, 2026-10-10): Change swaps the year picker for two, From and To, with
  // both ends spelled out (issue #168). `stop` is the change's To; null = the default period.
  const latest = latestStop(stops);
  const earlier = changeStops(stops, latest);
  const ends = changeEnds(stops, value.stop, value.since);
  const pick = (id: string) => (id === defaultStop ? null : id);
  // Change starts from the oldest period (the longest span, and for ACS the one that doesn't
  // overlap the latest), to the year picked in Values when there's an earlier one.
  const startChange = () => {
    const from = earlier[earlier.length - 1].id;
    onChange({ ...value, since: from, stop: changeEnds(stops, value.stop, from)!.to.id === value.stop ? value.stop : null });
  };
  /** A new To keeps From when it's still earlier, else starts from the oldest again. */
  const setTo = (id: string) => onChange({ ...value, stop: pick(id),
    since: changeStops(stops, stops.find((s) => s.id === id)!).some((s) => s.id === value.since) ? value.since : earlier[earlier.length - 1].id });
  const chip = (on: boolean) => `rounded-md px-2 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring ${on ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`;
  return (
    <div className="space-y-5">
      {levels.length > 1 && (
        <Section title="Geography">
          <div role="radiogroup" aria-label="Geography level" className="space-y-0.5">
            {([null, ...levels] as Array<GeoLevel | null>).map((l) => {
              const on = value.pinned === l;
              return (
                <label key={l ?? "auto"} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted/60">
                  <input type="radio" name="geo-level" checked={on} onChange={() => onChange({ ...value, pinned: l })} className="size-4 accent-[var(--ui-accent)]" />
                  <span className="flex-1">{l ? GEO_LEVELS[l].plural : "Automatic (changes as you zoom)"}</span>
                  {l === null && <span className="text-xs text-muted-foreground">{plural(shown)} now</span>}
                  {l && l === shown && value.pinned === null && <span className="text-xs text-muted-foreground">shown now</span>}
                </label>
              );
            })}
          </div>
          {value.pinned && "pinFloor" in GEO_LEVELS[value.pinned] && (
            <p className="px-1.5 text-xs text-muted-foreground">{GEO_LEVELS[value.pinned].plural} show once you zoom in closer than a few states.</p>
          )}
        </Section>
      )}
      {stops.length > 0 && defaultStop && (
        <Section title="Time">
          {earlier.length > 0 && (
            <div role="radiogroup" aria-label="Map shows" data-time-mode="" className="flex gap-1">
              {/* Back to Values keeps To as the year shown. */}
              <button type="button" role="radio" aria-checked={!ends} onClick={() => ends && onChange({ ...value, since: null })} className={chip(!ends)}>Values</button>
              <button type="button" role="radio" aria-checked={!!ends} onClick={() => !ends && startChange()} className={chip(!!ends)}>Change</button>
            </div>
          )}
          {ends ? (
            <>
              <div data-change-span="">
                <p className="text-2xl font-semibold tabular-nums">{ends.from.label} → {ends.to.label}</p>
                <p className="text-xs text-muted-foreground">The map shows how each area changed from {ends.from.label} to {ends.to.label}.</p>
              </div>
              <TimeControl label="From" stops={changeStops(stops, ends.to).reverse()} value={ends.from.id} onChange={(id) => onChange({ ...value, since: id })} />
              <TimeControl label="To" stops={[...earlier.slice(0, -1).reverse(), latest!]} value={ends.to.id} onChange={setTo} />
            </>
          ) : (
            <TimeControl stops={stops} value={value.stop ?? defaultStop} onChange={(id) => onChange({ ...value, stop: id === defaultStop ? null : id })} />
          )}
        </Section>
      )}
      {facets.length > 0 && (
        <Section title="Show/hide">
          {facets.map((f) => <FacetChecks key={f.field} facet={f} hidden={value.hidden[f.field]}
            onChange={(h) => onChange({ ...value, hidden: { ...value.hidden, [f.field]: h } })} />)}
        </Section>
      )}
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
    <div id="filters-panel" role="dialog" aria-modal="true" aria-label={`Map options for ${title}`} style={style}
      className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className={`flex min-h-0 flex-1 flex-col transition-opacity ${phase === "from" ? "opacity-0 duration-100" : "opacity-100 duration-200"}`}>
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <SlidersHorizontal className="size-5 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-tight">Map options</h2>
            <p className="truncate text-xs text-muted-foreground">{title}</p>
          </div>
          <button type="button" onClick={() => finish(false)} aria-label="Close map options without applying"
            className="-mr-1 rounded p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <FilterControls {...controls} value={draft} onChange={setDraft} />
        </div>
        <footer className="flex items-center gap-3 border-t bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <button type="button" onClick={() => setDraft(NO_FILTERS)} disabled={n === 0}
            className="rounded-md px-3 py-2.5 text-sm font-semibold text-primary disabled:text-muted-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-ring">Reset</button>
          <button type="button" onClick={() => finish(true)}
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring">
            Apply
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
 *  Changes apply live. Frosted glass (`.wg-glass`, Robbie 2026-10-02): the only glass over the map. */
export function FiltersSidebar({ top, bottom, value, onChange, onClose, hiddenWhileMoving, ...controls }: ControlsProps & {
  top: number;
  bottom: number;
  onClose: () => void;
  /** Smaller screens: the sidebar steps aside while the map moves. It also steps aside while the
   *  dataset drop-down is open, so the two never overlap. */
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
    <section ref={ref} id="filters-panel" aria-label="Map options" data-obstructs={hiddenWhileMoving ? undefined : ""}
      className={`wg-glass absolute left-3 z-30 flex w-80 flex-col overflow-hidden rounded-xl transition-opacity duration-200 md:left-4 ${hiddenWhileMoving ? "pointer-events-none opacity-0" : "opacity-100"}`}
      style={{ top, maxHeight: `calc(100% - ${top + bottom}px)` }}>
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="flex-1 text-sm font-semibold">Map options</h2>
        {n > 0 && <button type="button" onClick={() => onChange(NO_FILTERS)} className="rounded text-xs font-semibold text-primary hover:underline">Reset</button>}
        <button type="button" onClick={onClose} aria-label="Close map options" className="-mr-1.5 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <FilterControls {...controls} value={value} onChange={onChange} />
      </div>
    </section>
  );
}
