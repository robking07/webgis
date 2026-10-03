import { CornerUpLeft, Minus, Plus } from "lucide-react";
import type { RefObject } from "react";
import type { MapApi } from "../map/MapView";
import { HEADER_GAP } from "./layout";

/** Zoom pill (desktop; phones pinch-zoom) and the back button, which returns to the view
 *  before the last map click (only after a click has zoomed somewhere). */
export function MapControls({ mapApi, atRest, canGoBack, onBack, phone, cardH }: {
  mapApi: RefObject<MapApi | null>;
  /** The header and dataset card are showing (not immersed, not just peeking). */
  atRest: boolean;
  canGoBack: boolean;
  onBack: () => void;
  phone: boolean;
  /** The dataset card's height: on phones the back button sits just below it. */
  cardH: number;
}) {
  return (
    <>
      {/* Zoom: a solid pill (desktop; phones pinch-zoom). */}
      <div className={`wg-panel absolute right-3 z-20 hidden flex-col md:flex overflow-hidden rounded-[14px] transition-[top] duration-300 md:right-4 ${atRest ? "top-[68px]" : "top-3"}`}>
        <button type="button" onClick={() => mapApi.current?.zoomIn()} aria-label="Zoom in" className="wg-zbtn grid size-11 place-items-center text-foreground"><Plus className="size-4" aria-hidden /></button>
        <span className="mx-2.5 h-px bg-border" aria-hidden />
        <button type="button" onClick={() => mapApi.current?.zoomOut()} aria-label="Zoom out" className="wg-zbtn grid size-11 place-items-center text-foreground"><Minus className="size-4" aria-hidden /></button>
      </div>

      {/* Back to the view before the last map click (only after a click has zoomed somewhere). */}
      {canGoBack && (
        <button type="button" onClick={onBack} aria-label="Back to the previous view" title="Back to the previous view"
          className="wg-panel wg-zbtn absolute right-3 z-20 grid size-11 place-items-center rounded-[14px] text-foreground transition-[top] duration-300 md:right-4"
          // Desktop: under the zoom pill. Phones (no zoom pill): top right, below the dataset card at rest.
          style={{ top: phone ? (atRest ? HEADER_GAP + cardH + 8 : 12) : (atRest ? 166 : 110) }}>
          <CornerUpLeft className="size-[18px]" aria-hidden />
        </button>
      )}
    </>
  );
}
