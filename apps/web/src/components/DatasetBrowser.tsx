"use client";
import { useId } from "react";
import { DatasetFilter, useDatasetFilter } from "./DatasetFilter";
import { DATASET_BY_ID, type Dataset } from "@/lib/registry";

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

  return (
    <section id="datasets" aria-labelledby={headingId} className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 id={headingId} className="sr-only">Datasets</h2>
      <DatasetFilter q={q} setQ={setQ} cat={cat} setCat={setCat} />
      <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1" aria-label={`${results.length} datasets`}>
        {results.map((d) => (
          <DatasetItem key={d.id} d={d} isPrimary={d.id === primary} isSecondary={d.id === secondary}
            onPrimary={() => onPrimary(d.id)}
            onSecondary={() => onSecondary(d.id === secondary ? null : d.id)}
            canCompare={!!primary && d.id !== primary && d.measure.kind !== "features" && DATASET_BY_ID.get(primary)?.measure.kind !== "features"} />
        ))}
        {results.length === 0 && <li className="p-3 text-sm text-muted-foreground">No datasets match “{q}”.</li>}
      </ul>
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
        <span className="mt-0.5 block text-xs text-muted-foreground">{d.category} · {d.vintage}</span>
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
