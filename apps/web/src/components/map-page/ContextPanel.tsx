// "Why this matters" (issue #115): sourced context for a map, opened from a quiet link on the
// dataset card and closed by default. Laptops and monitors: a panel on the right, where place
// details open. Phones: a bottom sheet that peeks with the summary and swipes up for the rest.
// "About this data" (how it's measured) stays on the data page; this says why the pattern matters.
import { useEffect, type ReactNode } from "react";
import { ArrowUpRight, ChevronRight, X } from "lucide-react";
import { DATASET_BY_ID, type Dataset } from "@/lib/registry";
import type { MapContext } from "@/lib/context";
import { BottomSheet, useIsPhone } from "../BottomSheet";

/** Desktop panel width plus its right offset and a gap: the map padding while it's open. */
export const CONTEXT_PANEL_RIGHT = 72 + 320 + 16;

/** "… in 2023.[1]" → the text with a superscript link straight to source 1. */
function Cited({ text, ctx }: { text: string; ctx: MapContext }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[(\d+)\]/g)) {
    const s = ctx.sources[Number(m[1]) - 1];
    parts.push(text.slice(last, m.index));
    parts.push(
      <sup key={m.index}>
        <a href={s.url} target="_blank" rel="noopener" title={s.title} aria-label={`Source ${m[1]}: ${s.title}`}
          className="px-px font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">{m[1]}</a>
      </sup>,
    );
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

/** The entry point on the dataset card. */
export function ContextLink({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} data-context-link=""
      className="inline-flex items-center gap-0.5 rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring md:text-[13px]">
      Why this matters <ChevronRight className="size-3.5" aria-hidden />
    </button>
  );
}

const label = "mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

export function ContextPanel({ ctx, dataset, top, onClose, onMapIt }: { ctx: MapContext; dataset: Dataset; top: number; onClose: () => void; onMapIt: (id: string) => void }) {
  const phone = useIsPhone();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const name = `${dataset.title}: why this matters`;
  const summary = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          {!ctx.approved && (
            <span data-context-draft="" className="mb-1.5 inline-block rounded border border-current px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Draft · not approved
            </span>
          )}
          <h2 className="text-sm font-semibold leading-snug">Why this matters</h2>
          <p className="text-xs text-muted-foreground">{dataset.title}</p>
        </div>
        <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close why this matters"
          className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-2 text-[13px] leading-relaxed">
        {ctx.summary.map((s, i) => <p key={i}><Cited text={s} ctx={ctx} /></p>)}
      </div>
      {phone && <p className="mt-2 text-center text-xs text-muted-foreground group-data-[snap=full]:hidden">Swipe up for more, linked maps and sources</p>}
    </>
  );
  const linked = ctx.linked.map((l) => ({ ...l, d: DATASET_BY_ID.get(l.id) })).filter((l) => l.d);
  const rest = (
    <>
      <div className="mt-3">
        <p className={label}>{ctx.heading}</p>
        <ul className="list-disc space-y-1 pl-4 text-[13px] leading-snug marker:text-muted-foreground">
          {ctx.points.map((p, i) => <li key={i}><Cited text={p} ctx={ctx} /></li>)}
        </ul>
      </div>
      {linked.length > 0 && (
        <div className="mt-3 border-t pt-2">
          <p className={label}>Linked maps</p>
          <ul className="space-y-0.5">
            {linked.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => onMapIt(l.id)} data-linked-map={l.id}
                  className="group/l flex w-full items-baseline justify-between gap-2 rounded px-1 py-1 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                  <span className="text-[13px] font-medium text-primary group-hover/l:underline">{l.d!.title}</span>
                  <span className="text-right text-[11px] text-muted-foreground">{l.why}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3 border-t pt-2">
        <p className={label}>Sources</p>
        <ol className="space-y-1 text-[11.5px] leading-snug">
          {ctx.sources.map((s, i) => (
            <li key={s.url} className="flex gap-1.5">
              <span className="tabular-nums text-muted-foreground">{i + 1}.</span>
              <a href={s.url} target="_blank" rel="noopener" className="text-primary underline-offset-2 hover:underline">
                {s.title}<ArrowUpRight className="ml-0.5 inline size-3" aria-hidden />
              </a>
            </li>
          ))}
        </ol>
      </div>
      {/* The line between the two: how the map is measured lives on the data page. */}
      <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
        How this map is measured: <a href={`/data/${dataset.id}`} className="font-medium text-primary hover:underline">About this data →</a>
      </p>
    </>
  );

  if (phone) return <BottomSheet label={name} summary={summary} onClose={onClose}>{rest}</BottomSheet>;
  return (
    <section aria-label={name} data-obstructs="" data-context-panel=""
      className="absolute right-[72px] z-30 w-80 overflow-y-auto rounded-lg border bg-popover p-3 shadow-md transition-[top] duration-300"
      style={{ top, maxHeight: `calc(100% - ${top + 12}px)` }}>
      {summary}
      {rest}
    </section>
  );
}
