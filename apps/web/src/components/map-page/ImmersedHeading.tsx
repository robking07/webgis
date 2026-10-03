import { useState } from "react";
import { ChevronDown, Menu, SlidersHorizontal } from "lucide-react";
import type { Dataset } from "@/lib/registry";
import { DatasetHeading } from "../DatasetMenus";
import { LogoMark } from "../Logo";

/** Immersed: menu button and wordmark, then the category above the dataset name (both open menus),
 *  then the display options chip. */
export function ImmersedHeading({ primary, secondary, immersed, hasOptions, dockShown, chipLabel, onShowNav, onPick, onToggleDock, onMenuChange }: {
  primary: Dataset;
  secondary: Dataset | null;
  immersed: boolean;
  hasOptions: boolean;
  dockShown: boolean;
  /** The display options chip: the level ("Census tracts") or the filter state. */
  chipLabel: string;
  onShowNav: () => void;
  onPick: (id: string) => void;
  onToggleDock: () => void;
  /** A category or dataset menu opened or closed. */
  onMenuChange: (open: boolean) => void;
}) {
  // An open menu sits above every other map panel (legend, controls, details), never under one.
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div data-obstructs={immersed ? "" : undefined}
      className={`pointer-events-none absolute left-3 top-3 ${menuOpen ? "z-40" : "z-20"} flex flex-col gap-1 transition-opacity duration-300 md:left-4 ${immersed ? "opacity-100" : "opacity-0"}`}
      inert={!immersed || undefined} aria-hidden={!immersed || undefined}>
      <div className="pointer-events-auto flex items-center gap-3">
        <button type="button" onClick={onShowNav} aria-label="Show navigation"
          className="wg-glass grid size-10 place-items-center rounded-xl text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <Menu className="size-[18px]" aria-hidden />
        </button>
        <span className="flex items-center gap-2" aria-hidden>
          <span className="wg-logo-on-map"><LogoMark size={34} /></span>
          <span className="wg-wordmark hidden text-[34px] font-extrabold tracking-tight md:inline">Mapwich</span>
        </span>
      </div>
      <div className="mt-1">
        <DatasetHeading key={primary.id} primary={primary} secondary={secondary} onPick={onPick}
          onOpenChange={(o) => { setMenuOpen(o); onMenuChange(o); }} />
      </div>
      {hasOptions && (
        <button type="button" onClick={onToggleDock} aria-expanded={dockShown} aria-controls="display-dock"
          className="wg-glass pointer-events-auto mt-1 flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <SlidersHorizontal className="size-3.5" aria-hidden />
          {chipLabel}
          <ChevronDown className={`size-3.5 transition-transform ${dockShown ? "rotate-180" : ""}`} aria-hidden />
        </button>
      )}
    </div>
  );
}
