import { X } from "lucide-react";
import { DatasetBrowser } from "../DatasetBrowser";

/** Dataset browser (Change dataset / Compare): overlay panel (desktop) / sheet (phone). */
export function DatasetsPanel({ primary, secondary, onPrimary, onSecondary, onClose }: {
  primary: string | null;
  secondary: string | null;
  onPrimary: (id: string) => void;
  onSecondary: (id: string | null) => void;
  onClose: () => void;
}) {
  return (
    <section aria-label="Datasets" role="dialog" aria-modal="true"
      className="absolute inset-x-0 bottom-0 top-16 z-40 flex flex-col gap-3 rounded-t-2xl border bg-background p-4 shadow-xl md:inset-y-3 md:left-3 md:right-auto md:top-3 md:w-[380px] md:rounded-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Datasets</h2>
        <button type="button" onClick={onClose} aria-label="Close datasets" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" /></button>
      </div>
      <DatasetBrowser primary={primary} secondary={secondary} onPrimary={onPrimary} onSecondary={onSecondary} />
      <a href="/data" className="text-xs text-primary hover:underline">Browse the full data directory →</a>
    </section>
  );
}
