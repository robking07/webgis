import { Button } from "@/components/ui/button";
import type { Dataset } from "@/lib/registry";

/** Comparing, a map that can't pair with the second one was opened ("Map it", search): ask before
 *  leaving compare (Robbie, 2026-10-14, issue #198). Cancel keeps the comparison as it was. */
export function LeaveComparePrompt({ next, other, onOpen, onCancel }: { next: Dataset; other: Dataset; onOpen: () => void; onCancel: () => void }) {
  return (
    <section role="alertdialog" aria-modal="true" aria-labelledby="leave-compare" data-leave-compare=""
      className="absolute inset-x-0 bottom-0 z-40 flex flex-col gap-3 rounded-t-2xl border bg-background p-4 shadow-xl md:inset-x-auto md:bottom-auto md:left-3 md:top-3 md:w-[380px] md:rounded-xl">
      <h2 id="leave-compare" className="text-sm font-semibold leading-snug">{next.title} can&apos;t be compared with {other.title}. Open it on its own?</h2>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancel} autoFocus>Cancel</Button>
        <Button type="button" size="sm" onClick={onOpen}>Open on its own</Button>
      </div>
    </section>
  );
}
