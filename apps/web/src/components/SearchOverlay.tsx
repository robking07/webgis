"use client";
// One search for places and datasets (D-35). Opens over a dimmed map with large results,
// places and datasets in separate labeled groups. Arrow keys move, Enter picks, Esc closes.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Layers, Search, X } from "lucide-react";
import { searchDatasets, type Dataset } from "@/lib/registry";
import { loadPlaceIndex, searchPlaces, type PlaceHit, type PlaceRow } from "@/lib/search";

interface Props {
  onClose: () => void;
  onPlace: (p: PlaceHit) => void;
  onDataset: (d: Dataset) => void;
  current: string | null;
}

type Item = { kind: "place"; p: PlaceHit } | { kind: "dataset"; d: Dataset };

export function SearchOverlay({ onClose, onPlace, onDataset, current }: Props) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PlaceRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    input.current?.focus();
    loadPlaceIndex().then(setRows, () => setFailed(true));
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const places = useMemo(() => (rows ? searchPlaces(rows, q) : []), [rows, q]);
  const datasets = useMemo(() => (q.trim() ? searchDatasets(q, null).slice(0, 6) : []), [q]);
  const items: Item[] = [...places.map((p) => ({ kind: "place" as const, p })), ...datasets.map((d) => ({ kind: "dataset" as const, d }))];

  const pick = (it: Item) => (it.kind === "place" ? onPlace(it.p) : onDataset(it.d));
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === "Enter" && items[active]) { e.preventDefault(); pick(items[active]); }
  };
  const optId = (i: number) => `${listId}-${i}`;

  const row = (it: Item, i: number) => {
    const on = i === active;
    const cls = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${on ? "bg-muted" : "hover:bg-muted/60"}`;
    return it.kind === "place" ? (
      <li key={`p${i}`} id={optId(i)} role="option" aria-selected={on}>
        <button type="button" className={cls} onClick={() => pick(it)} onMouseEnter={() => setActive(i)} tabIndex={-1}>
          <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-base font-medium">{it.p.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{it.p.kind}</span>
        </button>
      </li>
    ) : (
      <li key={`d${i}`} id={optId(i)} role="option" aria-selected={on}>
        <button type="button" className={cls} onClick={() => pick(it)} onMouseEnter={() => setActive(i)} tabIndex={-1}>
          <Layers className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-medium">{it.d.title}{it.d.id === current && <span className="ml-2 text-xs font-normal text-muted-foreground">On the map</span>}</span>
            <span className="block truncate text-xs text-muted-foreground">{it.d.category} · {it.d.vintage}</span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/55 px-3 pt-[8vh] md:pt-[12vh]" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Search places and datasets" className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKeyDown}
            placeholder="Search a place or a dataset" aria-label="Search places and datasets"
            role="combobox" aria-expanded={items.length > 0} aria-controls={listId} aria-activedescendant={items[active] ? optId(active) : undefined}
            className="h-16 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground md:text-xl" />
          <button type="button" onClick={onClose} aria-label="Close search" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-5" /></button>
        </div>
        <div id={listId} role="listbox" aria-label="Results" className="min-h-0 overflow-y-auto p-2">
          {!q.trim() && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Try a city, county or state (“Duluth”, “Cook County”) or a topic (“commute”, “asthma”).</p>}
          {q.trim() && (
            <>
              <Group label="Places" empty={q.trim().length < 2 ? "Keep typing…" : failed ? "Place search is unavailable right now." : !rows ? "Loading places…" : "No matching places."}>
                {places.map((p, i) => row({ kind: "place", p }, i))}
              </Group>
              <Group label="Datasets" empty="No matching datasets.">
                {datasets.map((d, i) => row({ kind: "dataset", d }, places.length + i))}
              </Group>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ label, empty, children }: { label: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section aria-label={label} className="py-1">
      <h3 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
      {children.length ? <ul>{children}</ul> : <p className="px-3 py-2 text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}
