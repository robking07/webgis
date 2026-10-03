"use client";
// The immersed map heading (D-35): the category sits above the dataset name, and both open the
// dataset list. Larger screens get one drop-down panel with the categories beside that category's
// datasets (one click to switch). Phones open the list as a bottom sheet instead (issue #34):
// categories as a swipeable chip row, datasets below, in the same sheet the details use.
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { CATEGORIES, DATASETS, type Dataset } from "@/lib/registry";
import { BottomSheet } from "./BottomSheet";

interface Props {
  primary: Dataset;
  secondary: Dataset | null;
  onPick: (id: string) => void;
  /** Told when a menu opens or closes, so the page can hide panels the menu would cover (issue #32). */
  onOpenChange?: (open: boolean) => void;
  /** Phones: open the dataset list as a bottom sheet (owned by the page) instead of a drop-down. */
  onOpenSheet?: () => void;
  /** Changes when the page wants the drop-down closed (the map started moving). */
  closeKey?: number;
  /** The phone heading sits beside the menu button, on one line (no wordmark). */
  compact?: boolean;
}

export function DatasetHeading({ primary, secondary, onPick, onOpenChange, onOpenSheet, closeKey, compact }: Props) {
  /** The category whose datasets the open panel lists; null = closed. */
  const [menu, setMenu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const open = !!menu;
  const report = useRef(onOpenChange);
  report.current = onOpenChange;
  useEffect(() => {
    report.current?.(open);
    return () => { if (open) report.current?.(false); };
  }, [open]);
  useEffect(() => { setMenu(null); }, [closeKey]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setMenu(null); } };
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("pointerdown", close); window.removeEventListener("keydown", esc, true); };
  }, [menu]);

  const toggle = () => (onOpenSheet ? onOpenSheet() : setMenu(menu ? null : primary.category));

  return (
    <div ref={ref} className={`relative pointer-events-auto w-fit ${compact ? "min-w-0 max-w-[calc(100vw-8rem)]" : "ml-0.5 max-w-[calc(100vw-1.5rem)]"}`}>
      <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={`${primary.category}: choose a category`}
        className="wg-on-map flex items-center gap-1 rounded text-[11px] font-semibold uppercase tracking-wider text-foreground/75 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        {primary.category} <ChevronDown className="size-3" aria-hidden />
      </button>
      <button type="button" onClick={toggle}
        aria-expanded={open} aria-haspopup="menu" aria-label={`${primary.title}: other ${primary.category.toLowerCase()} datasets`}
        className="flex items-center gap-1.5 rounded text-left focus-visible:outline-2 focus-visible:outline-ring">
        <span className={`wg-on-map font-bold leading-snug text-foreground ${compact ? "line-clamp-2 text-[15px]" : "text-base md:text-[17px]"}`}>
          {primary.title}{secondary && <span className="font-semibold text-foreground/75"> × {secondary.title}</span>}
        </span>
        <ChevronDown className={`wg-on-map size-4 shrink-0 text-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {menu && (
        <div className="absolute left-0 top-full z-30 mt-1.5 flex max-h-[min(60vh,30rem)] w-[34rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border bg-popover shadow-xl">
          <div role="menu" aria-label="Categories" className="w-44 shrink-0 overflow-y-auto border-r p-1.5">
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categories</p>
            {CATEGORIES.map((c) => (
              <button key={c} type="button" role="menuitemradio" aria-checked={c === menu} onClick={() => setMenu(c)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring ${c === menu ? "bg-muted font-semibold" : "hover:bg-muted"}`}>
                <span className="flex-1">{c}</span>
                {c === primary.category && <span className="size-1.5 rounded-full bg-primary" aria-label="current" />}
              </button>
            ))}
          </div>
          <DatasetList category={menu} primary={primary} onPick={(id) => { onPick(id); setMenu(null); }} className="min-w-0 flex-1 overflow-y-auto p-1.5" />
        </div>
      )}
    </div>
  );
}

function DatasetList({ category, primary, onPick, className }: { category: string; primary: Dataset; onPick: (id: string) => void; className?: string }) {
  return (
    <div role="menu" aria-label={`${category} datasets`} className={className}>
      {DATASETS.filter((d) => d.category === category).map((d) => (
        <button key={d.id} type="button" role="menuitemradio" aria-checked={d.id === primary.id} onClick={() => onPick(d.id)}
          className="flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium leading-snug">{d.title}</span>
            <span className="block text-xs text-muted-foreground">{d.vintage}</span>
          </span>
          {d.id === primary.id && <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />}
        </button>
      ))}
    </div>
  );
}

/** Phones: the dataset list as a bottom sheet. Categories are a swipeable chip row; the datasets
 *  of the chosen one are listed below. Swipe down (or ✕) to close. */
export function DatasetSheet({ primary, onPick, onClose }: { primary: Dataset; onPick: (id: string) => void; onClose: () => void }) {
  const [category, setCategory] = useState(primary.category);
  const row = useRef<HTMLDivElement>(null);
  // Start with the current category's chip in view.
  useEffect(() => { row.current?.querySelector("[aria-checked=true]")?.scrollIntoView({ inline: "center", block: "nearest" }); }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const summary = (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Choose a dataset</h2>
        <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close the dataset list"
          className="-mr-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" /></button>
      </div>
      <div ref={row} role="radiogroup" aria-label="Categories" onPointerDown={(e) => e.stopPropagation()}
        className="-mx-4 flex touch-pan-x gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={c === category} onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full border px-3 py-1 text-[13px] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-ring ${c === category ? "border-primary bg-primary text-primary-foreground" : "text-foreground"}`}>
            {c}
          </button>
        ))}
      </div>
    </>
  );
  return (
    <BottomSheet label="Dataset list" summary={summary} onClose={onClose} initialSnap="full" fullRatio={0.58}>
      <DatasetList category={category} primary={primary} onPick={(id) => { onPick(id); onClose(); }} className="-mx-1.5 -mt-2" />
    </BottomSheet>
  );
}
