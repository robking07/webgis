// PROTOTYPE (issue #104, not for merge): "Why this matters" context for maps of preventable harm.
// Closed by default; opened from the dataset card. Desktop: a panel on the right (where place
// details open). Phones: a bottom sheet that peeks with the summary and swipes up for the rest.
import { useEffect, type ReactNode } from "react";
import { ArrowUpRight, ChevronRight, X } from "lucide-react";
import { DATASET_BY_ID } from "@/lib/registry";
import type { HarmContext } from "@/lib/harm-context";
import { BottomSheet, useIsPhone } from "../BottomSheet";

/** "… a year.[1]" → text with a superscript link to source 1. */
function Cited({ text, ns }: { text: string; ns: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[(\d+)\]/g)) {
    parts.push(text.slice(last, m.index));
    parts.push(<sup key={m.index}><a href={`#${ns}-src-${m[1]}`} className="px-px font-semibold text-primary hover:underline" aria-label={`Source ${m[1]}`}>{m[1]}</a></sup>);
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

export function DraftBadge() {
  return (
    <span className="rounded border border-current px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-muted-foreground" title="Drafted by Claude from the cited sources; not yet reviewed by Robbie">
      Draft · not reviewed
    </span>
  );
}

/** The entry point: a quiet text button on the dataset card. */
export function ContextEntry({ open, onOpen, className = "" }: { open: boolean; onOpen: () => void; className?: string }) {
  return (
    <button type="button" onClick={onOpen} aria-expanded={open} data-context-entry=""
      className={`inline-flex items-center gap-0.5 rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring md:text-[13px] ${className}`}>
      Why this matters <ChevronRight className="size-3.5" aria-hidden />
    </button>
  );
}

/** The body: summary, causes or effects, linked maps, the Special, sources. */
export function ContextBody({ ctx, onMapIt, part = "all", ns = "ctx" }: { ctx: HarmContext; onMapIt: (id: string) => void; part?: "summary" | "rest" | "all"; ns?: string }) {
  const summary = (
    <div className="space-y-2 text-[13px] leading-relaxed">
      {ctx.summary.map((s, i) => <p key={i}><Cited text={s} ns={ns} /></p>)}
    </div>
  );
  const label = "mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
  const rest = (
    <>
      <div className="mt-3">
        <p className={label}>{ctx.pointsHeading}</p>
        <ul className="list-disc space-y-1 pl-4 text-[13px] leading-snug marker:text-muted-foreground">
          {ctx.points.map((p, i) => <li key={i}><Cited text={p} ns={ns} /></li>)}
        </ul>
      </div>
      <div className="mt-3 border-t pt-2">
        <p className={label}>Linked maps</p>
        <ul className="space-y-0.5">
          {ctx.linked.map((l) => {
            const d = DATASET_BY_ID.get(l.id);
            if (!d) return null;
            return (
              <li key={l.id}>
                <button type="button" onClick={() => onMapIt(l.id)} data-linked-map={l.id}
                  className="group flex w-full items-baseline justify-between gap-2 rounded px-1 py-1 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                  <span className="text-[13px] font-medium text-primary group-hover:underline">{d.title}</span>
                  <span className="text-right text-[11px] text-muted-foreground">{l.why}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {ctx.special && (
        <div className="mt-3 border-t pt-2">
          <p className={label}>Special</p>
          {ctx.special.pending
            ? <p className="text-[13px] text-muted-foreground">{ctx.special.title} <span className="text-[11px]">(being written; the link appears when it is published)</span></p>
            : <a href={ctx.special.href} className="text-[13px] font-medium text-primary hover:underline">{ctx.special.title} →</a>}
        </div>
      )}
      <div className="mt-3 border-t pt-2">
        <p className={label}>Sources</p>
        <ol className="space-y-1 text-[11.5px] leading-snug">
          {ctx.sources.map((s, i) => (
            <li key={i} id={`${ns}-src-${i + 1}`} className="flex gap-1.5">
              <span className="tabular-nums text-muted-foreground">{i + 1}.</span>
              <a href={s.url} target="_blank" rel="noopener" className="text-primary underline-offset-2 hover:underline">
                {s.label}<ArrowUpRight className="ml-0.5 inline size-3" aria-hidden />
              </a>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
  if (part === "summary") return summary;
  if (part === "rest") return rest;
  return <>{summary}{rest}</>;
}

/** Desktop: a panel on the right, below the header. Phones: a bottom sheet. */
export function HarmContextPanel({ ctx, title, top, onClose, onMapIt }: { ctx: HarmContext; title: string; top: number; onClose: () => void; onMapIt: (id: string) => void }) {
  const phone = useIsPhone();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const head = (
    <div className="mb-2 flex items-start justify-between gap-2">
      <div>
        <DraftBadge />
        <h2 className="mt-1.5 text-sm font-semibold leading-snug">{title}: why this matters</h2>
      </div>
      <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close context"
        className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        <X className="size-4" />
      </button>
    </div>
  );
  if (phone) {
    return (
      <BottomSheet label={`${title}: why this matters`} onClose={onClose}
        summary={<>{head}<ContextBody ctx={ctx} onMapIt={onMapIt} part="summary" /><p className="mt-2 text-center text-xs text-muted-foreground group-data-[snap=full]:hidden">Swipe up for causes, linked maps and sources</p></>}>
        <ContextBody ctx={ctx} onMapIt={onMapIt} part="rest" />
      </BottomSheet>
    );
  }
  return (
    <section aria-label={`${title}: why this matters`} data-obstructs="" data-context-panel=""
      className="absolute right-[72px] z-30 w-80 overflow-y-auto rounded-lg border bg-popover p-3 shadow-md transition-[top] duration-300"
      style={{ top, maxHeight: `calc(100% - ${top + 12}px)` }}>
      {head}
      <ContextBody ctx={ctx} onMapIt={onMapIt} />
    </section>
  );
}
