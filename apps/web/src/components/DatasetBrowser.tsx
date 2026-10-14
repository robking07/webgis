"use client";
import { useId } from "react";
import { DatasetFilter, useDatasetFilter } from "./DatasetFilter";
import { bySubcategory, type Dataset } from "@/lib/registry";
import { pairReason } from "@/lib/layers";

interface Props {
  /** The dataset in the slot being filled (marked current). */
  current: string | null;
  /** The map the pick will be compared with (issue #198): datasets that can't pair with it show
   *  greyed out with the reason, instead of silently leaving compare. null = no comparison. */
  pairWith: Dataset | null;
  onPick: (id: string) => void;
}

/** Search + category filter over the registry. Fully keyboard operable. */
export function DatasetBrowser({ current, pairWith, onPick }: Props) {
  const { q, setQ, cat, setCat, results } = useDatasetFilter();
  const headingId = useId();
  const Sub = cat ? "h3" : "h4";

  return (
    <section id="datasets" aria-labelledby={headingId} className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 id={headingId} className="sr-only">Datasets</h2>
      <DatasetFilter q={q} setQ={setQ} cat={cat} setCat={setCat} />
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1" aria-label={`${results.length} datasets`} role="region">
        {/* Subcategory headings in the list; with "All", each category's name heads its first group. */}
        {bySubcategory(results).map((g, i, gs) => (
          <section key={`${g.category}/${g.subcategory}`} aria-label={`${g.category}: ${g.subcategory}`}>
            {!cat && gs[i - 1]?.category !== g.category && <h3 className="px-1 pt-3 text-sm font-semibold">{g.category}</h3>}
            <Sub className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.subcategory}</Sub>
            <ul className="space-y-1">
              {g.datasets.map((d) => (
                <DatasetItem key={d.id} d={d} isCurrent={d.id === current} onPick={() => onPick(d.id)}
                  reason={pairWith && d.id !== current ? pairReason(d, pairWith) : null} />
              ))}
            </ul>
          </section>
        ))}
        {results.length === 0 && <p className="p-3 text-sm text-muted-foreground">No datasets match “{q}”.</p>}
      </div>
    </section>
  );
}

function DatasetItem({ d, isCurrent, onPick, reason }: { d: Dataset; isCurrent: boolean; onPick: () => void; reason: string | null }) {
  return (
    <li className={`group rounded-lg border p-2.5 transition-colors ${isCurrent ? "border-primary bg-card" : reason ? "border-transparent" : "border-transparent hover:border-border hover:bg-card"}`}>
      <button type="button" onClick={onPick} aria-current={isCurrent || undefined} disabled={!!reason}
        className="block w-full text-left focus-visible:outline-2 focus-visible:outline-ring rounded disabled:cursor-not-allowed">
        <span className={`block text-sm font-medium leading-snug ${reason ? "text-muted-foreground" : ""}`}>{d.title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{reason ?? d.vintage}</span>
      </button>
    </li>
  );
}
