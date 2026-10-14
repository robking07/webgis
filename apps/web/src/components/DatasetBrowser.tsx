"use client";
import { useId } from "react";
import { DatasetFilter, useDatasetFilter } from "./DatasetFilter";
import { DATASET_BY_ID, bySubcategory, type Dataset } from "@/lib/registry";

interface Props {
  primary: string | null;
  secondary: string | null;
  onPrimary: (id: string) => void;
  onSecondary: (id: string | null) => void;
}

/** Search + category filter over the registry. Fully keyboard operable. */
export function DatasetBrowser({ primary, secondary, onPrimary, onSecondary }: Props) {
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
                <DatasetItem key={d.id} d={d} isPrimary={d.id === primary} isSecondary={d.id === secondary}
                  onPrimary={() => onPrimary(d.id)}
                  onSecondary={() => onSecondary(d.id === secondary ? null : d.id)}
                  canCompare={!!primary && d.id !== primary && d.measure.kind !== "features" && DATASET_BY_ID.get(primary)?.measure.kind !== "features"} />
              ))}
            </ul>
          </section>
        ))}
        {results.length === 0 && <p className="p-3 text-sm text-muted-foreground">No datasets match “{q}”.</p>}
      </div>
    </section>
  );
}

function DatasetItem({ d, isPrimary, isSecondary, onPrimary, onSecondary, canCompare }: {
  d: Dataset; isPrimary: boolean; isSecondary: boolean; onPrimary: () => void; onSecondary: () => void; canCompare: boolean;
}) {
  return (
    <li className={`group rounded-lg border p-2.5 transition-colors ${isPrimary ? "border-primary bg-card" : isSecondary ? "border-dashed border-primary bg-card" : "border-transparent hover:border-border hover:bg-card"}`}>
      <button type="button" onClick={onPrimary} aria-current={isPrimary || undefined} className="block w-full text-left focus-visible:outline-2 focus-visible:outline-ring rounded">
        <span className="block text-sm font-medium leading-snug">{d.title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{d.vintage}</span>
      </button>
      {canCompare && (
        <button type="button" onClick={onSecondary} aria-pressed={isSecondary}
          className="mt-1.5 text-xs text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring rounded">
          {isSecondary ? "Stop comparing" : "Compare with map (bivariate)"}
        </button>
      )}
    </li>
  );
}
