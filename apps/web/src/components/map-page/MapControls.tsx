import { CornerUpLeft, Map as MapIcon, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Bbox, MapApi } from "../map/MapView";
import { loadPlaceIndex, toHit, type PlaceHit, type PlaceRow } from "@/lib/search";
import { REGIONS } from "@/lib/us-view";
import { HEADER_GAP } from "./layout";

/** Zoom pill (desktop; phones pinch-zoom), the "Go to" picker (issue #202), and the back button,
 *  which returns to the view before the last map click (only after a click has zoomed somewhere). */
export function MapControls({ mapApi, atRest, canGoBack, onBack, phone, cardH, onRegion, onPlace }: {
  mapApi: RefObject<MapApi | null>;
  /** The header and dataset card are showing (not immersed, not just peeking). */
  atRest: boolean;
  canGoBack: boolean;
  onBack: () => void;
  phone: boolean;
  /** The dataset card's height: on phones the column sits just below it. */
  cardH: number;
  onRegion: (bbox: Bbox) => void;
  /** A state picked from the list: the search's own path, so it focuses like a click (issue #203). */
  onPlace: (p: PlaceHit) => void;
}) {
  // Desktop: under the zoom pill. Phones (no zoom pill): top right, below the dataset card at rest.
  const top = phone ? (atRest ? HEADER_GAP + cardH + 8 : 12) : (atRest ? 166 : 110);
  return (
    <>
      {/* Zoom: a solid pill (desktop; phones pinch-zoom). */}
      <div className={`wg-panel absolute right-3 z-20 hidden flex-col md:flex overflow-hidden rounded-[14px] transition-[top] duration-300 md:right-4 ${atRest ? "top-[68px]" : "top-3"}`}>
        <button type="button" onClick={() => mapApi.current?.zoomIn()} aria-label="Zoom in" className="wg-zbtn grid size-11 place-items-center text-foreground"><Plus className="size-4" aria-hidden /></button>
        <span className="mx-2.5 h-px bg-border" aria-hidden />
        <button type="button" onClick={() => mapApi.current?.zoomOut()} aria-label="Zoom out" className="wg-zbtn grid size-11 place-items-center text-foreground"><Minus className="size-4" aria-hidden /></button>
      </div>

      <GoTo top={top} onRegion={onRegion} onPlace={onPlace} />

      {/* Back to the view before the last map click (only after a click has zoomed somewhere). */}
      {canGoBack && (
        <button type="button" onClick={onBack} aria-label="Back to the previous view" title="Back to the previous view"
          className="wg-panel wg-zbtn absolute right-3 z-20 grid size-11 place-items-center rounded-[14px] text-foreground transition-[top] duration-300 md:right-4"
          style={{ top: top + 52 }}>
          <CornerUpLeft className="size-[18px]" aria-hidden />
        </button>
      )}
    </>
  );
}

/** "Go to": the U.S. regions, then every state (from the place search index, loaded on first open). */
function GoTo({ top, onRegion, onPlace }: { top: number; onRegion: (bbox: Bbox) => void; onPlace: (p: PlaceHit) => void }) {
  const [open, setOpen] = useState(false);
  const [states, setStates] = useState<PlaceHit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    loadPlaceIndex().then((rows: PlaceRow[]) => setStates(rows.filter((r) => r[1] === "State").map(toHit).sort((a, b) => a.name.localeCompare(b.name))), () => setFailed(true));
    const out = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    // Esc closes only the picker (not the full-screen view) and hands focus back to its button.
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      ref.current?.querySelector<HTMLElement>("[aria-expanded]")?.focus();
      setOpen(false);
    };
    document.addEventListener("pointerdown", out);
    window.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("pointerdown", out); window.removeEventListener("keydown", esc, true); };
  }, [open]);
  const item = "wg-zbtn rounded-lg px-2.5 py-1.5 text-left text-sm text-foreground";
  return (
    <div ref={ref} className="absolute right-3 z-20 transition-[top] duration-300 md:right-4" style={{ top }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Go to a region or state" title="Go to a region or state"
        className="wg-panel wg-zbtn grid size-11 place-items-center rounded-[14px] text-foreground">
        <MapIcon className="size-[18px]" aria-hidden />
      </button>
      {open && (
        <section role="dialog" aria-label="Go to"
          className="absolute right-full top-0 mr-2 flex max-h-[min(60vh,28rem)] w-56 flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl">
          <div className="grid grid-cols-2 gap-1 border-b p-1.5">
            {REGIONS.map((r) => (
              <button key={r.id} type="button" className={item} onClick={() => { setOpen(false); onRegion([...r.bbox]); }}>{r.label}</button>
            ))}
          </div>
          <h3 className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">States</h3>
          <ul className="overflow-y-auto px-1.5 pb-1.5">
            {failed ? <li className="px-2.5 py-1.5 text-sm text-muted-foreground">States couldn&apos;t load.</li>
              : !states ? <li className="px-2.5 py-1.5 text-sm text-muted-foreground">Loading…</li>
              : states.map((p) => (
                <li key={p.geoid}>
                  <button type="button" className={`${item} w-full`} onClick={() => { setOpen(false); onPlace(p); }}>{p.name}</button>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
