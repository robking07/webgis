"use client";
// The one dataset menu (issue #225): the title and its caret open it, on the card and in the
// immersed heading (D-35). Larger screens get a tall drop-down with a search box, the categories
// beside that category's datasets, and a link to the full data library. Phones open the same list
// as a bottom sheet instead (issue #34): categories as a swipeable chip row, datasets below, in the
// same sheet the details use. Both carry compare mode's picking states (D-323).
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES, DATASETS, LIBRARY_LABEL, bySubcategory, libraryIn, searchDatasets, type Dataset } from "@/lib/registry";
import { pairReason } from "@/lib/layers";
import { BottomSheet } from "./BottomSheet";
import { DatasetSearch } from "./DatasetFilter";

/** Which map the menu picks: "a" the (first) map, "b" the second map of a comparison, "ask" which
 *  of the two compared maps to replace (issue #198). */
export type BrowseSlot = "ask" | "a" | "b";

interface PickerProps {
  slot: BrowseSlot;
  primary: Dataset;
  secondary: Dataset | null;
  onSlot: (slot: "a" | "b") => void;
  onPick: (id: string) => void;
  onClose: () => void;
  /** Lists only the maps this passes (the compare page: maps that work for the places). */
  fits?: (d: Dataset) => boolean;
}

/** What the drop-down and the sheet share: the search, the category shown, and the compare states. */
function usePicker({ slot, primary, secondary, fits }: PickerProps) {
  /** The map in the slot being filled (marked current). */
  const shown = slot === "b" ? secondary : primary;
  const [q, setQ] = useState("");
  // Categories with nothing to list are left out (compare page).
  const categories = useMemo(() => CATEGORIES.filter((c) => !fits || DATASETS.some((d) => d.category === c && fits(d))), [fits]);
  const [category, setCategory] = useState<string>(() => { const c = (shown ?? primary).category; return categories.includes(c) ? c : categories[0] ?? c; });
  const searching = !!q.trim();
  const datasets = useMemo(() => (searching ? searchDatasets(q, null) : DATASETS.filter((d) => d.category === category)).filter((d) => !fits || fits(d)), [searching, q, category, fits]);
  // Filling one slot of a comparison: the pick must pair with the map in the other slot.
  const pairWith = slot === "b" ? primary : slot === "a" ? secondary : null;
  const title = slot === "ask" ? "Replace which map?" : slot === "b" && !secondary ? "Choose a second map"
    : secondary ? `Replace ${shown!.title}` : null;
  return { q, setQ, category, categories, searching, datasets, pairWith, title, fits, current: shown?.id ?? null, currentCategory: shown?.category,
    pickCategory: (c: string) => { setCategory(c); setQ(""); } };
}
type Picker = ReturnType<typeof usePicker>;

const DATA_LIBRARY = <Link href="/data" className="text-xs font-medium text-primary hover:underline">Browse the full data library →</Link>;

function PairNote({ pairWith }: { pairWith: Dataset }) {
  return <p className="text-xs text-muted-foreground">Shown on one map with {pairWith.title}. Greyed-out maps can&apos;t be paired with it.</p>;
}

/** Comparing: which of the two maps to replace. */
function AskSlot({ primary, secondary, onSlot }: Pick<PickerProps, "primary" | "secondary" | "onSlot">) {
  return (
    <div className="flex flex-col gap-2">
      {([["a", primary], ["b", secondary!]] as const).map(([s, d]) => (
        <Button key={s} type="button" variant="outline" onClick={() => onSlot(s)} autoFocus={s === "a"} className="h-auto justify-start whitespace-normal py-2 text-left">{d.title}</Button>
      ))}
    </div>
  );
}

/** Laptops and up: the drop-down under the title. Its parent holds the title that toggles it. */
export function DatasetMenu(props: PickerProps) {
  const { slot, primary, secondary, onSlot, onPick } = props;
  const p = usePicker(props);
  const ref = useRef<HTMLElement>(null);
  // As tall as the screen allows below the title, stopping above the legend strip like the filters
  // sidebar does (D-135); the lists scroll inside it.
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const fit = () => ref.current && setHeight(Math.max(240, window.innerHeight - ref.current.getBoundingClientRect().top - 84));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const close = useRef(props.onClose);
  useEffect(() => { close.current = props.onClose; });
  useEffect(() => {
    // A click on the title is its own toggle, so only clicks outside the parent close the menu here.
    const out = (e: PointerEvent) => { if (!ref.current?.parentElement?.contains(e.target as Node)) close.current(); };
    // Esc closes only the menu (not the full-screen view) and hands focus back to the title.
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      ref.current?.parentElement?.querySelector<HTMLElement>("[aria-expanded=true]")?.focus();
      close.current();
    };
    document.addEventListener("pointerdown", out);
    window.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("pointerdown", out); window.removeEventListener("keydown", esc, true); };
  }, []);

  return (
    <section ref={ref} role="dialog" aria-label="Datasets" style={slot === "ask" ? undefined : { height }}
      className="absolute left-0 top-full z-30 mt-1.5 flex w-[34rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-xl border bg-popover text-left text-popover-foreground shadow-xl">
      <div className="flex flex-col gap-2 border-b p-2.5">
        {p.title && <h2 className="px-0.5 text-sm font-semibold">{p.title}</h2>}
        {slot === "ask" ? <AskSlot primary={primary} secondary={secondary} onSlot={onSlot} /> : <DatasetSearch q={p.q} setQ={p.setQ} autoFocus />}
        {p.pairWith && <PairNote pairWith={p.pairWith} />}
      </div>
      {slot !== "ask" && (
        <div className="flex min-h-0 flex-1">
          <div role="menu" aria-label="Categories" className="w-44 shrink-0 overflow-y-auto border-r p-1.5">
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categories</p>
            {p.categories.map((c) => (
              <button key={c} type="button" role="menuitemradio" aria-checked={!p.searching && c === p.category} onClick={() => p.pickCategory(c)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring ${!p.searching && c === p.category ? "bg-muted font-semibold" : "hover:bg-muted"}`}>
                <span className="flex-1">{c}</span>
                {c === p.currentCategory && <span className="size-1.5 rounded-full bg-primary" aria-label="current" />}
              </button>
            ))}
          </div>
          <DatasetList p={p} onPick={onPick} className="min-w-0 flex-1 overflow-y-auto p-1.5" />
        </div>
      )}
      <div className="border-t px-3 py-2">{DATA_LIBRARY}</div>
    </section>
  );
}

function DatasetList({ p, onPick, className }: { p: Picker; onPick: (id: string) => void; className?: string }) {
  const groups = bySubcategory(p.datasets);
  // Which subcategory's Library maps are shown under its Featured ones (#372).
  const [more, setMore] = useState<string | null>(null);
  const row = (d: Dataset) => {
    const reason = p.pairWith && d.id !== p.current ? pairReason(d, p.pairWith) : null;
    return (
      <button key={d.id} type="button" role="menuitemradio" aria-checked={d.id === p.current} disabled={!!reason} onClick={() => onPick(d.id)}
        className="flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:hover:bg-transparent">
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-medium leading-snug ${reason ? "text-muted-foreground" : ""}`}>{d.title}</span>
          <span className="block text-xs text-muted-foreground">{reason ?? (d.library ? `${LIBRARY_LABEL} · ${d.vintage}` : d.vintage)}</span>
        </span>
        {d.id === p.current && <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />}
      </button>
    );
  };
  return (
    <div role="menu" aria-label={p.searching ? `${p.datasets.length} datasets match` : `${p.category} datasets`} className={className}>
      {groups.map((g, i) => (
        <div key={`${g.category}/${g.subcategory}`} role="group" aria-label={p.searching ? `${g.category}: ${g.subcategory}` : g.subcategory}>
          {/* Search results span categories: each category's name heads its first group. */}
          {p.searching && groups[i - 1]?.category !== g.category && <p aria-hidden className="px-2.5 pt-3 text-sm font-semibold">{g.category}</p>}
          <p aria-hidden className="px-2.5 pb-0.5 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.subcategory}</p>
          {g.datasets.map(row)}
          {!p.searching && <LibraryMore id={`${g.category}/${g.subcategory}`} maps={libraryIn(g.category, g.subcategory).filter((d) => !p.fits || p.fits(d))} current={p.current} more={more} setMore={setMore} row={row} />}
        </div>
      ))}
      {!p.datasets.length && <p className="p-3 text-sm text-muted-foreground">No datasets match “{p.q}”.</p>}
    </div>
  );
}

/** "More in the Library (n)": a subcategory's Library maps, folded under its Featured ones (#372).
 *  Search finds them too; the category lists never show them unfolded. */
function LibraryMore({ id, maps, current, more, setMore, row }: { id: string; maps: Dataset[]; current: string | null; more: string | null; setMore: (id: string | null) => void; row: (d: Dataset) => ReactNode }) {
  if (!maps.length) return null;
  // Starts open when the map on screen is one of them.
  const open = more === id || (more == null && maps.some((d) => d.id === current));
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setMore(open ? "" : id)}
        className="flex w-full items-center gap-1 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
        More in the Library ({maps.length}) <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && maps.map(row)}
    </>
  );
}

/** The heading over the map: the category above the dataset name, both opening the dataset menu
 *  (`children`, the open drop-down on larger screens). */
export function DatasetHeading({ primary, secondary, open, onToggle, compact, clearBack, children }: {
  primary: Dataset;
  secondary: Dataset | null;
  open: boolean;
  onToggle: () => void;
  /** The phone heading sits beside the menu button, on one line (no wordmark). */
  compact?: boolean;
  /** Phones: the back button sits at the top right, so a long title stops short of it (issue #243). */
  clearBack?: boolean;
  children?: ReactNode;
}) {
  return (
    // The heading sits on a solid panel with full-contrast text, never halo-only text over the map
    // (Robbie, 2026-10-03, issue #34: "get serious about making this easier to see on mobile"; the
    // halo read just as badly over dark classes on laptops and monitors, so every size gets it).
    <div data-dataset-heading="" className={`wg-panel relative pointer-events-auto w-fit rounded-xl px-2.5 py-1 ${compact ? `min-w-0 ${clearBack ? "max-w-[calc(100vw-8rem)]" : "max-w-[calc(100vw-5.25rem)]"}` :"max-w-[calc(100vw-1.5rem)]"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-haspopup="dialog" aria-label={`${primary.category}: choose a category`}
        className="flex items-center gap-1 rounded text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        {primary.category} <ChevronDown className="size-3" aria-hidden />
      </button>
      <button type="button" onClick={onToggle}
        aria-expanded={open} aria-haspopup="dialog" aria-label={`${primary.title}: other ${primary.category.toLowerCase()} datasets`}
        className="flex items-center gap-1.5 rounded text-left focus-visible:outline-2 focus-visible:outline-ring">
        <span className={`font-bold leading-snug text-foreground ${compact ? "line-clamp-2 text-[15px]" : "text-base md:text-[17px]"}`}>
          {primary.title}{secondary && <span className="font-semibold text-muted-foreground"> × {secondary.title}</span>}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {children}
    </div>
  );
}

/** Phones: the dataset menu as a bottom sheet. A search box, then the categories as a swipeable
 *  chip row; the datasets of the chosen one (or the search's matches) are listed below. Swipe down
 *  (or ✕) to close. */
export function DatasetSheet(props: PickerProps) {
  const { slot, primary, secondary, onSlot, onPick, onClose } = props;
  const p = usePicker(props);
  const row = useRef<HTMLDivElement>(null);
  // Start with the current category's chip in view.
  useEffect(() => { row.current?.querySelector("[aria-checked=true]")?.scrollIntoView({ inline: "center", block: "nearest" }); }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  // The search and chips take their own pointers, so typing or swiping them never drags the sheet.
  const stop = (e: SyntheticEvent) => e.stopPropagation();
  const summary = (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{p.title ?? "Choose a dataset"}</h2>
        <button type="button" onClick={onClose} onPointerDown={stop} aria-label="Close the dataset list"
          className="-mr-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" /></button>
      </div>
      {slot !== "ask" && (
        <div className="flex flex-col gap-2">
          <div onPointerDown={stop}><DatasetSearch q={p.q} setQ={p.setQ} /></div>
          {p.pairWith && <PairNote pairWith={p.pairWith} />}
          <div ref={row} role="radiogroup" aria-label="Categories" onPointerDown={stop}
            className="-mx-4 flex touch-pan-x gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {p.categories.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={!p.searching && c === p.category} onClick={() => p.pickCategory(c)}
                className={`shrink-0 rounded-full border px-3 py-1 text-[13px] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-ring ${!p.searching && c === p.category ? "border-primary bg-primary text-primary-foreground" : "text-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
  return (
    <BottomSheet label="Dataset list" summary={summary} onClose={onClose} initialSnap="full" fullRatio={0.58}>
      {slot === "ask" ? <AskSlot primary={primary} secondary={secondary} onSlot={onSlot} /> : (
        <>
          <DatasetList p={p} onPick={onPick} className="-mx-1.5 -mt-2" />
          <p className="pb-2 pt-3">{DATA_LIBRARY}</p>
        </>
      )}
    </BottomSheet>
  );
}
