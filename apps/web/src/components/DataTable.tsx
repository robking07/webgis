"use client";
// Text alternative to the map: every geography at the current level with its value(s),
// sortable and searchable. Tract level is too large and has no name lookup, so the
// table offers state and county only.
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { formatValue, type GeoLevel } from "@webgis/design";
import { StatusState } from "@webgis/design/components";
import { Input } from "@/components/ui/input";
import type { Dataset } from "@/lib/registry";
import type { Values } from "@/lib/values";

let namesCache: Promise<Record<string, string>> | null = null;
const loadNames = () => (namesCache ??= fetch("/data/geo/names.json").then((r) => r.json()));

interface Props {
  level: GeoLevel;
  x: Dataset; xv?: Values;
  y?: Dataset | null; yv?: Values;
  onClose: () => void;
}

export function DataTable({ level, x, xv, y, yv, onClose }: Props) {
  const [names, setNames] = useState<Record<string, string> | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: "name" | "x" | "y"; desc: boolean }>({ col: "x", desc: true });
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { loadNames().then(setNames, () => setNames({})); closeRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = useMemo(() => {
    if (!xv || !names) return [];
    const term = q.toLowerCase();
    const r = Object.keys(xv)
      .map((g) => ({ g, name: names[g] ?? g, x: xv[g], y: yv?.[g] }))
      .filter((r) => !term || r.name.toLowerCase().includes(term));
    const dir = sort.desc ? -1 : 1;
    r.sort((a, b) => sort.col === "name" ? dir * a.name.localeCompare(b.name) : dir * ((a[sort.col] ?? -Infinity) - (b[sort.col] ?? -Infinity)));
    return r;
  }, [xv, yv, names, q, sort]);

  const th = (col: "name" | "x" | "y", label: string) => (
    <th scope="col" aria-sort={sort.col === col ? (sort.desc ? "descending" : "ascending") : "none"} className="sticky top-0 bg-card px-2 py-1.5 text-left font-medium">
      <button type="button" className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => setSort((s) => ({ col, desc: s.col === col ? !s.desc : col !== "name" }))}>
        {label}{sort.col === col ? (sort.desc ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );

  return (
    <section role="dialog" aria-modal="false" aria-label={`Table of ${x.title}`}
      className="absolute inset-y-3 right-3 z-30 flex w-[min(28rem,calc(100%-1.5rem))] flex-col gap-2 rounded-lg border bg-card p-3 shadow-lg">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{x.title}{y ? ` × ${y.title}` : ""}</h2>
          <p className="text-xs text-muted-foreground">By {level} · {rows.length.toLocaleString()} rows · select a column to sort</p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close table" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <X className="size-4" />
        </button>
      </header>
      {level === "tract" ? (
        <StatusState status="empty" message="The table covers states and counties. Zoom out to county level to use it." />
      ) : !xv || !names ? <StatusState status="loading" /> : (
        <>
          <label className="sr-only" htmlFor="table-filter">Filter by name</label>
          <Input id="table-filter" type="search" placeholder="Filter by name…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="min-h-0 flex-1 overflow-auto rounded border">
            <table className="w-full text-xs tabular-nums">
              <caption className="sr-only">{x.title}{y ? ` and ${y.title}` : ""} by {level}</caption>
              <thead><tr>{th("name", "Name")}{th("x", x.title)}{y && th("y", y.title)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.g} className="border-t">
                    <th scope="row" className="px-2 py-1 text-left font-normal">{r.name}</th>
                    <td className="px-2 py-1 text-right">{formatValue(r.x, x.unit)}</td>
                    {y && <td className="px-2 py-1 text-right">{formatValue(r.y, y.unit)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
