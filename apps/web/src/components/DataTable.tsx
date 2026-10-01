"use client";
// Text alternative to the map: every geography at the current level with its value(s),
// sortable, searchable, and clickable (a row flies the map there and opens its details).
// Rows are windowed (only the visible ones render), so 3,000+ counties scroll smoothly.
// Tract level is too large and has no name lookup, so the table offers state and county.
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { formatValue, type GeoLevel } from "@webgis/design";
import { StatusState } from "@webgis/design/components";
import { Input } from "@/components/ui/input";
import type { Dataset } from "@/lib/registry";
import type { Values } from "@/lib/values";

/** geoid → [name, lon, lat] for states and counties (exported by ingest). */
export type Places = Record<string, [string, number, number]>;
let placesCache: Promise<Places> | null = null;
export const loadPlaces = () => (placesCache ??= fetch("/data/geo/places.json").then((r) => r.json()));

const ROW_H = 32;
const OVERSCAN = 8;

interface Props {
  level: GeoLevel;
  x: Dataset; xv?: Values;
  y?: Dataset | null; yv?: Values;
  onClose: () => void;
  /** The selected place's geoid, highlighted in the list. */
  selected?: string | null;
  /** Fly the map to this place and open its details. */
  onPick: (geoid: string, name: string, lon: number, lat: number) => void;
}

/** Memoized: the map page re-renders on every hover; the table must not. */
export const DataTable = memo(function DataTable({ level, x, xv, y, yv, selected, onClose, onPick }: Props) {
  const [places, setPlaces] = useState<Places | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: "name" | "x" | "y"; desc: boolean }>({ col: "x", desc: true });
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(400);
  const scroller = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { loadPlaces().then(setPlaces, () => setPlaces({})); closeRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [places]);

  // Sort once per input change; filtering is a cheap pass over the sorted list.
  const sorted = useMemo(() => {
    if (!xv || !places) return [];
    const r = Object.keys(xv).map((g) => ({ g, name: places[g]?.[0] ?? g, x: xv[g], y: yv?.[g] }));
    const dir = sort.desc ? -1 : 1;
    r.sort((a, b) => sort.col === "name" ? dir * a.name.localeCompare(b.name) : dir * ((a[sort.col] ?? -Infinity) - (b[sort.col] ?? -Infinity)));
    return r;
  }, [xv, yv, places, sort]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? sorted.filter((r) => r.name.toLowerCase().includes(term)) : sorted;
  }, [sorted, q]);
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); setScrollTop(0); }, [q, sort]);

  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const last = Math.min(rows.length, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN);
  const visible = rows.slice(first, last);
  const cols = y ? 3 : 2;

  const th = (col: "name" | "x" | "y", label: string) => (
    <th scope="col" aria-sort={sort.col === col ? (sort.desc ? "descending" : "ascending") : "none"} className="sticky top-0 z-10 bg-card px-2 py-1.5 text-left font-medium">
      <button type="button" className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => setSort((s) => ({ col, desc: s.col === col ? !s.desc : col !== "name" }))}>
        {label}{sort.col === col ? (sort.desc ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );

  return (
    // Phones and tablets: docked to the bottom 42% so a picked place stays visible above it (D-33).
    <section role="dialog" aria-modal="false" aria-label={`Table of ${x.title}`} data-obstructs=""
      className="absolute inset-x-0 bottom-0 z-40 flex h-[42%] flex-col gap-2 rounded-t-2xl border bg-card p-3 shadow-lg lg:inset-y-3 lg:bottom-3 lg:left-3 lg:right-auto lg:h-auto lg:w-[28rem] lg:rounded-lg">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{x.title}{y ? ` × ${y.title}` : ""}</h2>
          <p className="text-xs text-muted-foreground">By {level} · {rows.length.toLocaleString()} {rows.length === 1 ? "row" : "rows"} · select a place to go there</p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close table" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <X className="size-4" />
        </button>
      </header>
      {level === "tract" ? (
        <StatusState status="empty" message="The table covers states and counties. Zoom out to county level to use it." />
      ) : !xv || !places ? <StatusState status="loading" /> : (
        <>
          <label className="sr-only" htmlFor="table-filter">Filter by name</label>
          <Input id="table-filter" type="search" placeholder="Filter by name…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div ref={scroller} className="min-h-0 flex-1 overflow-auto rounded border" onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
            <table className="w-full table-fixed text-xs tabular-nums" aria-rowcount={rows.length + 1}>
              <caption className="sr-only">{x.title}{y ? ` and ${y.title}` : ""} by {level}. Select a place to show it on the map.</caption>
              <colgroup><col /><col className="w-28" />{y && <col className="w-28" />}</colgroup>
              <thead><tr>{th("name", "Name")}{th("x", x.title)}{y && th("y", y.title)}</tr></thead>
              <tbody>
                {first > 0 && <tr aria-hidden style={{ height: first * ROW_H }}><td colSpan={cols} /></tr>}
                {visible.map((r, i) => {
                  const p = places[r.g];
                  return (
                    <tr key={r.g} className={`border-t hover:bg-muted ${r.g === selected ? "bg-muted font-semibold" : ""}`} aria-selected={r.g === selected || undefined} style={{ height: ROW_H }} aria-rowindex={first + i + 2}>
                      <th scope="row" className="truncate px-2 text-left font-normal">
                        {p ? (
                          <button type="button" onClick={() => onPick(r.g, r.name, p[1], p[2])}
                            className="w-full truncate rounded text-left text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">{r.name}</button>
                        ) : r.name}
                      </th>
                      <td className="px-2 text-right">{formatValue(r.x, x.unit)}</td>
                      {y && <td className="px-2 text-right">{formatValue(r.y, y.unit)}</td>}
                    </tr>
                  );
                })}
                {last < rows.length && <tr aria-hidden style={{ height: (rows.length - last) * ROW_H }}><td colSpan={cols} /></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
});
