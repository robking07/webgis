import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dataset } from "@/lib/registry";
import { DatasetBrowser } from "../DatasetBrowser";

/** Which map the panel picks: "a" the (first) map, "b" the second map of a comparison, "ask" which
 *  of the two compared maps to replace (issue #198). */
export type BrowseSlot = "ask" | "a" | "b";

/** Dataset browser (Change dataset / Compare datasets): overlay panel (desktop) / sheet (phone). */
export function DatasetsPanel({ slot, primary, secondary, onSlot, onPick, onClose }: {
  slot: BrowseSlot;
  primary: Dataset;
  secondary: Dataset | null;
  onSlot: (slot: "a" | "b") => void;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  // Filling one slot of a comparison: the pick must pair with the map in the other slot.
  const pairWith = slot === "b" ? primary : secondary;
  const title = slot === "ask" ? "Replace which map?" : slot === "b" && !secondary ? "Choose a second map"
    : secondary ? `Replace ${(slot === "a" ? primary : secondary).title}` : "Datasets";
  return (
    <section aria-label="Datasets" role="dialog" aria-modal="true"
      className="absolute inset-x-0 bottom-0 top-16 z-40 flex flex-col gap-3 rounded-t-2xl border bg-background p-4 shadow-xl md:inset-y-3 md:left-3 md:right-auto md:top-3 md:w-[380px] md:rounded-xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close datasets" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" /></button>
      </div>
      {slot === "ask" && secondary ? (
        <div className="flex flex-col gap-2">
          {([["a", primary], ["b", secondary]] as const).map(([s, d]) => (
            <Button key={s} type="button" variant="outline" onClick={() => onSlot(s)} className="h-auto justify-start whitespace-normal py-2 text-left">{d.title}</Button>
          ))}
        </div>
      ) : (
        <>
          {pairWith && <p className="-mt-1 text-xs text-muted-foreground">Shown on one map with {pairWith.title}. Greyed-out maps can&apos;t be paired with it.</p>}
          <DatasetBrowser current={slot === "b" ? secondary?.id ?? null : primary.id} pairWith={pairWith} onPick={onPick} />
          <Link href="/data" className="text-xs text-primary hover:underline">Browse the full data directory →</Link>
        </>
      )}
    </section>
  );
}
