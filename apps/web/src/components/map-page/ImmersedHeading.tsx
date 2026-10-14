import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dataset } from "@/lib/registry";
import { DatasetHeading } from "../DatasetMenus";
import { LogoMark } from "../Logo";
import { FilterButton } from "./FiltersPanel";
import { ChangeDatasetButton } from "./DatasetCard";

/** Immersed: menu button and wordmark, then the category above the dataset name (both open the
 *  dataset list), then the filter button with a caption (the level shown, or what's filtered).
 *  Phones drop the wordmark and put the heading beside the menu button, on one row (issue #34). */
export function ImmersedHeading({ primary, secondary, immersed, hasFilters, filtersOpen, filterCount, caption, captionHint, phone, motion, closeKey, onShowNav, onPick, onOpenFilters, onOpenLevel, levelPill, onMenuChange, onOpenSheet, onBrowse, onExit }: {
  primary: Dataset;
  secondary: Dataset | null;
  immersed: boolean;
  hasFilters: boolean;
  filtersOpen: boolean;
  filterCount: number;
  /** Beside the filter button: the level ("Census tracts") or the filters ("2 road types hidden"). */
  caption: string;
  /** Near a band edge: the next level ("block groups closer in"). */
  captionHint?: string | null;
  phone: boolean;
  /** The map is moving on a smaller screen: "hide" (phones) or "dim" (laptops) the menu button and wordmark. */
  motion: "hide" | "dim" | null;
  closeKey: number;
  onShowNav: () => void;
  onPick: (id: string) => void;
  onOpenFilters: (el: HTMLElement) => void;
  /** The caption pill: open Filters (not toggle) with the geography level in view. */
  onOpenLevel: (el: HTMLElement) => void;
  /** The caption names the geography level (false for road layers, where it summarizes filters). */
  levelPill: boolean;
  /** A dataset drop-down opened or closed. */
  onMenuChange: (open: boolean) => void;
  /** Phones: open the dataset list sheet. */
  onOpenSheet?: () => void;
  /** Laptops and up: open the dataset browser (the Change dataset button). */
  onBrowse: () => void;
  /** Compare mode: back to the first map alone. Full screen folds the card's compare strip into this
   *  heading as an Exit button (Robbie, 2026-10-14, issue #198). */
  onExit: () => void;
}) {
  // An open menu sits above every other map panel (legend, controls, details), never under one.
  const [menuOpen, setMenuOpen] = useState(false);
  const motionClass = motion === "hide" ? "wg-step-aside" : motion === "dim" ? "wg-dim" : "";
  const heading = (
    <DatasetHeading key={primary.id} primary={primary} secondary={secondary} onPick={onPick} compact={phone} closeKey={closeKey}
      onOpenSheet={onOpenSheet} onOpenChange={(o) => { setMenuOpen(o); onMenuChange(o); }} />
  );
  return (
    <div data-immersed-heading="" data-obstructs={immersed ? "" : undefined}
      className={`pointer-events-none absolute left-3 top-3 ${menuOpen ? "z-40" : "z-20"} flex flex-col gap-1 transition-opacity duration-300 md:left-4 ${immersed ? "opacity-100" : "opacity-0"}`}
      inert={!immersed || undefined} aria-hidden={!immersed || undefined}>
      <div className="pointer-events-auto flex items-center gap-3">
        <button type="button" onClick={onShowNav} aria-label="Show navigation"
          className={`wg-panel grid size-10 shrink-0 place-items-center rounded-xl text-foreground transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-ring ${motionClass}`}>
          <Menu className="size-[18px]" aria-hidden />
        </button>
        {phone ? heading : (
          <span className={`flex items-center gap-2 transition-opacity duration-200 ${motionClass}`} aria-hidden>
            <span className="wg-logo-on-map"><LogoMark size={34} /></span>
            <span className="wg-wordmark text-[34px] font-extrabold tracking-tight">Mapwich</span>
          </span>
        )}
      </div>
      {!phone && <div className="mt-1.5">{heading}</div>}
      <div className={`mt-1 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 ${phone ? "pl-[52px]" : "pl-0.5"}`}>
        {!phone && <ChangeDatasetButton onClick={onBrowse} />}
        {secondary && (
          <Button type="button" size="sm" variant="ghost" onClick={onExit} aria-label="Exit comparing" data-compare-exit=""
            className="wg-panel wg-compare pointer-events-auto rounded-full text-xs font-semibold text-primary"><X aria-hidden />{phone ? "Exit" : "Exit comparing"}</Button>
        )}
        {hasFilters && <FilterButton count={filterCount} open={filtersOpen} onOpen={onOpenFilters} />}
        {/* The level pill is a real button: it opens Filters at the geography level (D-35), and being
            interactive it keeps clicks off the map behind it (issue #100). It sits on a solid pill like
            the Filters button, never halo text over the map (issue #34). */}
        {hasFilters ? (
          <button type="button" data-filter-note="" data-level-pill="" onClick={(e) => onOpenLevel(e.currentTarget)} aria-expanded={filtersOpen} aria-controls="filters-panel"
            aria-label={`${levelPill ? "Geography level" : "Filter"}: ${caption}${captionHint ? `, ${captionHint}` : ""}`}
            className="wg-panel pointer-events-auto inline-flex h-7 min-w-0 cursor-pointer items-center rounded-full px-2.5 text-xs font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <span className="truncate">{caption}{captionHint && <span className="font-medium text-muted-foreground"> · {captionHint}</span>}</span>
          </button>
        ) : (
          <span data-filter-note="" className="wg-panel pointer-events-auto inline-flex h-7 min-w-0 items-center rounded-full px-2.5 text-xs font-semibold text-foreground">
            <span className="truncate">{caption}{captionHint && <span className="font-medium text-muted-foreground"> · {captionHint}</span>}</span>
          </span>
        )}
      </div>
    </div>
  );
}
