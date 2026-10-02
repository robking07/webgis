import { useState, type ReactNode, type RefObject } from "react";
import { ChevronDown, Info, SlidersHorizontal } from "lucide-react";
import type { Dataset } from "@/lib/registry";
import { TERM_BY_ID } from "@/lib/glossary";

/** At rest: the factual dataset card (category, title, meta line, explainer, actions, display options). */
export function DatasetCard({ cardRef, primary, secondary, meta, immersed, isFeature, tableReady, hasOptions, optionsOpen, onToggleOptions, onBrowse, onTable, options }: {
  cardRef: RefObject<HTMLElement | null>;
  primary: Dataset;
  secondary: Dataset | null;
  /** "Census tract · 2020–2024 (5-year estimate) · U.S. Census Bureau" */
  meta: string;
  immersed: boolean;
  isFeature: boolean;
  tableReady: boolean;
  hasOptions: boolean;
  optionsOpen: boolean;
  onToggleOptions: () => void;
  /** Open the dataset browser (Change dataset / Compare). */
  onBrowse: () => void;
  onTable: () => void;
  /** The display options, shown when opened. */
  options: ReactNode;
}) {
  const [explainOpen, setExplainOpen] = useState(false);
  return (
    <section ref={cardRef} aria-label="Mapped dataset" data-obstructs={!immersed ? "" : undefined}
      className={`absolute left-3 right-3 top-[68px] z-20 rounded-lg border bg-card p-3 shadow-sm transition-all duration-300 md:left-4 md:right-auto md:w-80 md:p-4 ${immersed ? "pointer-events-none -translate-y-3 opacity-0" : "opacity-100"}`}
      inert={immersed || undefined}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{primary.category}</span>
        <button type="button" onClick={onBrowse} className="rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">Change dataset</button>
      </div>
      <h1 className="mt-1 text-lg font-bold leading-snug tracking-tight md:text-xl">
        {primary.title}{secondary && <span className="font-semibold text-muted-foreground"> × {secondary.title}</span>}
      </h1>
      <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground md:text-[13px]">
        <span>{meta}</span>
        {primary.terms.length > 0 && (
          <button type="button" onClick={() => setExplainOpen((o) => !o)} aria-expanded={explainOpen} aria-label="What do these numbers mean?"
            className="mt-px shrink-0 rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-3.5" aria-hidden /></button>
        )}
      </p>
      {explainOpen && (
        <dl className="mt-2 space-y-1.5 rounded-md bg-muted p-2.5 text-[11.5px] leading-snug">
          {primary.terms.map((id) => TERM_BY_ID.get(id)).filter((t) => !!t).map((t) => (
            <div key={t!.id}><dt className="inline font-semibold">{t!.term}: </dt><dd className="inline">{t!.short}</dd></div>
          ))}
          <a href={`/data/${primary.id}#explainers`} className="block pt-0.5 text-primary hover:underline">More on the data page →</a>
        </dl>
      )}
      {/* Actions, then Display options: one wrapping row on phones (so Table and Compare are
          reachable there too, D-33 P3); on desktop Display options sits on its own line. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!isFeature && <button type="button" onClick={onBrowse} className="rounded-md border px-2.5 py-1 text-[13px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Compare</button>}
        {tableReady && <button type="button" onClick={onTable} className="rounded-md border px-2.5 py-1 text-[13px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Table</button>}
        <a href={`/data/${primary.id}`} className="rounded-md border px-2.5 py-1 text-[13px] text-foreground hover:bg-muted"><span className="md:hidden">About</span><span className="hidden md:inline">About this data</span></a>
        {/* Progressive disclosure: options stay tucked away until asked for. */}
        {hasOptions && (
          <button type="button" onClick={onToggleOptions} aria-expanded={optionsOpen} aria-controls="display-options"
            className="flex items-center gap-1.5 rounded px-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:mt-1 md:basis-full md:px-0">
            <SlidersHorizontal className="size-3.5" aria-hidden /> <span className="md:hidden">Options</span><span className="hidden md:inline">Display options</span> <ChevronDown className={`size-3.5 transition-transform ${optionsOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
        )}
      </div>
      {optionsOpen && (
        <div id="display-options" className="mt-2 max-h-[45vh] space-y-4 overflow-y-auto border-t pt-3">
          {options}
        </div>
      )}
    </section>
  );
}
