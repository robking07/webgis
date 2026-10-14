import { useState, type ReactNode, type RefObject } from "react";
import { ArrowLeftRight, ChevronDown, Info, Layers, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dataset } from "@/lib/registry";
import { TERM_BY_ID } from "@/lib/glossary";
import { ShareButton } from "../ShareButton";
import { FilterButton } from "./FiltersPanel";

/** "Change dataset" is a real button (Robbie, issue #199: "a pretty important thing that needs to be
 *  highlighted"): the accent-filled pill beside Map options, the same height (D-135). On the card at
 *  rest, and beside Map options on laptops once the card hides (Robbie, 2026-10-14). */
export function ChangeDatasetButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button type="button" size="sm" onClick={onClick} aria-haspopup="dialog" data-change-dataset=""
      className="pointer-events-auto rounded-full text-xs font-semibold"><Layers aria-hidden />Change dataset</Button>
  );
}

/** Compare mode (issue #198): a tinted strip across the card's top says two maps are compared, with
 *  Swap (switch which is first) and Exit (back to the first map alone). Robbie, 2026-10-14. */
function CompareStrip({ onSwap, onExit, className }: { onSwap: () => void; onExit: () => void; className: string }) {
  return (
    <div data-compare-strip="" className={`flex items-center gap-1 rounded-t-lg bg-compare ${className}`}>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">Comparing two maps</span>
      <Button type="button" size="sm" variant="ghost" onClick={onSwap} aria-label="Swap the two maps" className="text-primary hover:bg-card"><ArrowLeftRight aria-hidden />Swap</Button>
      <Button type="button" size="sm" variant="ghost" onClick={onExit} aria-label="Exit comparing" className="text-primary hover:bg-card"><X aria-hidden />Exit</Button>
    </div>
  );
}

/** At rest: the factual dataset card (category, title, filter button, meta line, explainer, actions). */
export function DatasetCard({ cardRef, primary, secondary, meta, immersed, isFeature, tableReady, hasFilters, filtersOpen, filterCount, onOpenFilters, onBrowse, onTable, phone, onOpenSheet, contextLink, onCompare, onSwap, onExit }: {
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
  /** Change dataset: the dataset browser (or, comparing, which map to replace). */
  onBrowse: () => void;
  /** Compare datasets: pick a second map. */
  onCompare: () => void;
  onTable: () => void;
  /** Phones get a compact card (issue #34): the title's caret opens the dataset list, and the
   *  actions are links on the meta line, so less of the map sits under the card. */
  phone?: boolean;
  onOpenSheet?: () => void;
  /** "Why this matters" (issue #115), on maps that have context; absent everywhere else. */
  contextLink?: ReactNode;
  /** Compare mode: swap the two maps, or go back to the first one alone. */
  onSwap: () => void;
  onExit: () => void;
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
  const buttons = (onChange: (() => void) | undefined) => (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <ChangeDatasetButton onClick={onChange} />
      {hasFilters && <FilterButton count={filterCount} open={filtersOpen} onOpen={onOpenFilters} />}
    </div>
  );
  const shell = `absolute left-3 right-3 top-[68px] z-20 rounded-lg border bg-card shadow-sm transition-all duration-300 ${immersed ? "pointer-events-none -translate-y-3 opacity-0" : "opacity-100"}`;

  if (phone) {
    // Robbie (2026-10-03): "Text wrapping here is a bad look". The meta and the actions each get
    // one line that never wraps: the meta uses the period without its note and the short source
    // name (and ellipsizes as a last resort); the actions sit on their own line.
    const link = "rounded font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring";
    const share = <ShareButton variant="link" size="xs" className="h-auto p-0 font-semibold" />;
    // Comparing: the strip takes the category row (two maps have no one category), and Share moves
    // to the actions line in place of Compare datasets, so the card grows only by the strip's padding.
    const actions = [
      !isFeature && !secondary && <button key="c" type="button" onClick={onCompare} className={link}>Compare datasets</button>,
      tableReady && <button key="t" type="button" onClick={onTable} className={link}>Table</button>,
      <a key="a" href={`/data/${primary.id}`} className={link}>About</a>,
      secondary && <span key="s">{share}</span>,
    ].filter(Boolean);
    return (
      <section ref={cardRef} aria-label="Mapped dataset" data-obstructs={!immersed ? "" : undefined} className={`${shell} wg-panel px-3 py-2.5`} inert={immersed || undefined}>
        {/* Share sits in the category row's empty right side: the actions line below must stay one line at 360 px. */}
        {secondary ? <CompareStrip onSwap={onSwap} onExit={onExit} className="-mx-3 -mt-2.5 mb-1 px-3 py-0.5" /> : (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{primary.category}</span>
            {share}
          </div>
        )}
        <h1>
          <button type="button" onClick={onOpenSheet} aria-haspopup="dialog" aria-label={`${primary.title}: choose another dataset`}
            className="flex items-center gap-1 rounded text-left text-lg font-bold leading-snug tracking-tight text-balance focus-visible:outline-2 focus-visible:outline-ring">
            <span>{primary.title}{secondary && <span className="font-semibold text-muted-foreground"> × {secondary.title}</span>}</span>
            <ChevronDown className="size-4 shrink-0" aria-hidden />
          </button>
        </h1>
        {buttons(onOpenSheet)}
        <p data-card-meta="" className="mt-1.5 flex items-center whitespace-nowrap text-xs leading-relaxed text-muted-foreground">
          <span className="min-w-0 truncate">{meta}</span>{infoButton}
        </p>
        <p data-card-actions="" className="mt-0.5 whitespace-nowrap text-xs leading-relaxed text-muted-foreground">
          {actions.map((a, i) => <span key={i}>{i > 0 && <span aria-hidden> · </span>}{a}</span>)}
        </p>
        {/* Its own line: the actions line above must stay one line at 360 px. */}
        {contextLink && <p className="mt-0.5 leading-relaxed">{contextLink}</p>}
        {explain}
      </section>
    );
  }
  return (
    <section ref={cardRef} aria-label="Mapped dataset" data-obstructs={!immersed ? "" : undefined}
      className={`${shell} p-3 md:left-4 md:right-auto md:w-80 md:p-4`} inert={immersed || undefined}>
      {secondary && <CompareStrip onSwap={onSwap} onExit={onExit} className="-mx-3 -mt-3 mb-2 px-3 py-1 md:-mx-4 md:-mt-4 md:px-4" />}
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{primary.category}</span>
      <h1 className="mt-1 text-lg font-bold leading-snug tracking-tight md:text-xl">
        {primary.title}{secondary && <span className="font-semibold text-muted-foreground"> × {secondary.title}</span>}
      </h1>
      {buttons(onBrowse)}
      <p className="mt-1.5 text-xs text-muted-foreground md:text-[13px]">{meta}{infoButton}</p>
      {contextLink && <p className="mt-1.5">{contextLink}</p>}
      {explain}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!isFeature && !secondary && <button type="button" onClick={onCompare} className="rounded-md border px-2.5 py-1 text-[13px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Compare datasets</button>}
        {tableReady && <button type="button" onClick={onTable} className="rounded-md border px-2.5 py-1 text-[13px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Table</button>}
        <a href={`/data/${primary.id}`} className="rounded-md border px-2.5 py-1 text-[13px] text-foreground hover:bg-muted">About this data</a>
        <ShareButton className="h-auto bg-transparent py-1 text-[13px] font-normal dark:bg-transparent" />
      </div>
    </section>
  );
}
