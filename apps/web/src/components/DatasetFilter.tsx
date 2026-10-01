"use client";
// The one dataset search + category filter, shared by the map's dataset browser and
// the place profile page.
import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CATEGORIES, searchDatasets, type Dataset } from "@/lib/registry";

export function useDatasetFilter() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const results = useMemo(() => searchDatasets(q, cat), [q, cat]);
  return { q, setQ, cat, setCat, results };
}

export function DatasetFilter({ q, setQ, cat, setCat, placeholder = "Search datasets…" }: {
  q: string; setQ: (q: string) => void; cat: string | null; setCat: (c: string | null) => void; placeholder?: string;
}) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="sr-only">{placeholder.replace("…", "")}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input id={id} type="search" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
      </div>
      <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1.5">
        {[null, ...CATEGORIES].map((c) => (
          <button key={c ?? "all"} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}
            className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring">
            {c ?? "All"}
          </button>
        ))}
      </div>
    </>
  );
}

export type { Dataset };
