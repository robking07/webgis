import { useState } from "react";
import { Menu } from "lucide-react";
import type { Dataset } from "@/lib/registry";
import { DatasetHeading } from "../DatasetMenus";
import { LogoMark } from "../Logo";
import { FilterButton } from "./FiltersPanel";

/** Immersed: menu button and wordmark, then the category above the dataset name (both open the
 *  dataset list), then the filter button with a caption (the level shown, or what's filtered).
 *  Phones drop the wordmark and put the heading beside the menu button, on one row (issue #34). */
export function ImmersedHeading({ primary, secondary, immersed, hasFilters, filtersOpen, filterCount, caption, captionHint, phone, motion, closeKey, onShowNav, onPick, onOpenFilters, onMenuChange, onOpenSheet }: {
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
  /** A dataset drop-down opened or closed. */
  onMenuChange: (open: boolean) => void;
  /** Phones: open the dataset list sheet. */
  onOpenSheet?: () => void;
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
      {!phone && <div className="mt-1">{heading}</div>}
      <div className={`mt-1 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 ${phone ? "pl-[52px]" : "pl-0.5"}`}>
        {hasFilters && <FilterButton count={filterCount} open={filtersOpen} onOpen={onOpenFilters} />}
        <span className="wg-on-map truncate text-xs font-semibold text-foreground">
          {caption}{captionHint && <span className="font-medium text-foreground/70"> · {captionHint}</span>}
        </span>
      </div>
    </div>
  );
}
