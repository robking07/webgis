import { useState, type RefObject } from "react";
import { ChevronDown, Info } from "lucide-react";
import type { Dataset } from "@/lib/registry";
import { TERM_BY_ID } from "@/lib/glossary";
import { FilterButton } from "./FiltersPanel";

/** At rest: the factual dataset card (category, title, filter button, meta line, explainer, actions). */
export function DatasetCard({ cardRef, primary, secondary, meta, immersed, isFeature, tableReady, hasFilters, filtersOpen, filterCount, onOpenFilters, onBrowse, onTable, phone, onOpenSheet }: {
  cardRef: RefObject<HTMLElement | null>;
  primary: Dataset;
  secondary: Dataset | null;
  /** "Census tract · 2020–2024 (5-year estimate) · U.S. Census Bureau" */
  meta: string;
  immersed: boolean;
  isFeature: boolean;
  tableReady: boolean;
  hasFilters: boolean;
  filtersOpen: boolean;
  filterCount: number;
  onOpenFilters: (el: HTMLElement) => void;
  /** Open the dataset browser (Change dataset / Compare). */
  onBrowse: () => void;
  onTable: () => void;
  /** Phones get a compact card (issue #34): the title's caret opens the dataset list, and the
   *  actions are links on the meta line, so less of the map sits under the card. */
  phone?: boolean;
  onOpenSheet?: () => void;
}) {
  const [explainOpen, setExplainOpen] = useState(false);
  const explain = explainOpen && (
    <dl className="mt-2 space-y-1.5 rounded-md bg-muted p-2.5 text-[11.5px] leading-snug">
      {primary.terms.map((id) => TERM_BY_ID.get(id)).filter((t) => !!t).map((t) => (
        <div key={t!.id}><dt className="inline font-semibold">{t!.term}: </dt><dd className="inline">{t!.short}</dd></div>
      ))}
      <a href={`/data/${primary.id}#explainers`} className="block pt-0.5 text-primary hover:underline">More on the data page →</a>
    </dl>
  );
  const infoButton = primary.terms.length > 0 && (
    <button type="button" onClick={() => setExplainOpen((o) => !o)} aria-expanded={explainOpen} aria-label="What do these numbers mean?"
      className="ml-1 shrink-0 rounded align-[-2px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-3.5" aria-hidden /></button>
  );
  const filterButton = hasFilters && <FilterButton count={filterCount} open={filtersOpen} onOpen={onOpenFilters} className="mt-1.5" />;
  const shell = `absolute left-3 right-3 top-[68px] z-20 rounded-lg border bg-card shadow-sm transition-all duration-300 ${immersed ? "pointer-events-none -translate-y-3 opacity-0" : "opacity-100"}`;

  if (phone) {
    // Robbie (2026-10-03): "Text wrapping here is a bad look". The meta and the actions each get
    // one line that never wraps: the meta uses the period without its note and the short source
    // name (and ellipsizes as a last resort); the actions sit on their own line.
    const link = "rounded font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring";
    const actions = [
      !isFeature && <button key="c" type="button" onClick={onBrowse} className={link}>Compare</button>,
      tableReady && <button key="t" type="button" onClick={onTable} className={link}>Table</button>,
      <a key="a" href={`/data/${primary.id}`} className={link}>About</a>,
    ].filter(Boolean);
    return (
      <section ref={cardRef} aria-label="Mapped dataset" data-obstructs={!immersed ? "" : undefined} className={`${shell} wg-panel px-3 py-2.5`} inert={immersed || undefined}>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{primary.category}</span>
        <h1>
          <button type="button" onClick={onOpenSheet} aria-haspopup="dialog" aria-label={`${primary.title}: choose another dataset`}
            className="flex items-center gap-1 rounded text-left text-lg font-bold leading-snug tracking-tight text-balance focus-visible:outline-2 focus-visible:outline-ring">
            <span>{primary.title}{secondary && <span className="font-semibold text-muted-foreground"> × {secondary.title}</span>}</span>
            <ChevronDown className="size-4 shrink-0" aria-hidden />
          </button>
        </h1>
        {filterButton}
        <p data-card-meta="" className="mt-1.5 flex items-center whitespace-nowrap text-xs leading-relaxed text-muted-foreground">
          <span className="min-w-0 truncate">{meta}</span>{infoButton}
        </p>
        <p data-card-actions="" className="mt-0.5 whitespace-nowrap text-xs leading-relaxed text-muted-foreground">
          {actions.map((a, i) => <span key={i}>{i > 0 && <span aria-hidden> · </span>}{a}</span>)}
        </p>
        {explain}
      </section>
    );
  }
  return (
    <section ref={cardRef} aria-label="Mapped dataset" data-obstructs={!immersed ? "" : undefined}
      className={`${shell} p-3 md:left-4 md:right-auto md:w-80 md:p-4`} inert={immersed || undefined}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{primary.category}</span>
        <button type="button" onClick={onBrowse} className="rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">Change dataset</button>
      </div>
      <h1 className="mt-1 text-lg font-bold leading-snug tracking-tight md:text-xl">
        {primary.title}{secondary && <span className="font-semibold text-muted-foreground"> × {secondary.title}</span>}
      </h1>
      {filterButton}
      <p className="mt-1.5 text-xs text-muted-foreground md:text-[13px]">{meta}{infoButton}</p>
      {explain}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!isFeature && <button type="button" onClick={onBrowse} className="rounded-md border px-2.5 py-1 text-[13px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Compare</button>}
        {tableReady && <button type="button" onClick={onTable} className="rounded-md border px-2.5 py-1 text-[13px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Table</button>}
        <a href={`/data/${primary.id}`} className="rounded-md border px-2.5 py-1 text-[13px] text-foreground hover:bg-muted">About this data</a>
      </div>
    </section>
  );
}
