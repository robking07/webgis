// Year control (D-36): step the map through a dataset's timeline stops. A few stops are a
// segmented row; many (single years) are a notched slider with step buttons (the thumb lands only on a year; no filled track, so it never
// reads as a range), and an average or normal that isn't a moment in time is its own choice.
// Dragging scrubs (issue #165, after Watermelon UI's scrub-slider): the big year follows the thumb
// live and the map loads on a short pause or on release, so a drag doesn't fetch every year.
"use client";
import { useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Stop } from "@/lib/periods";

const DATED = /^\d{4}$/;

export function TimeControl({ stops, value, onChange, docked, label }: {
  stops: Stop[];
  /** Selected stop id. */
  value: string;
  onChange: (id: string) => void;
  /** Immersed dock: transparent, text halos. */
  docked?: boolean;
  /** Heading in place of "Years"/"Year" (the change map's "Compare with…"). */
  label?: string;
}) {
  const [scrub, setScrub] = useState<number | null>(null);
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const current = stops.find((s) => s.id === value) ?? stops.find((s) => s.isDefault)!;
  const summary = stops.find((s) => s.isDefault && !DATED.test(s.id));
  const dated = stops.filter((s) => s !== summary);
  const chip = (on: boolean) =>
    `rounded-md px-2 py-1 text-xs font-medium tabular-nums focus-visible:outline-2 focus-visible:outline-ring ${on ? "bg-primary text-primary-foreground" : docked ? "wg-panel text-foreground" : "border hover:bg-muted"}`;

  if (stops.length <= 4) {
    return (
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-semibold">{label ?? "Years"}</legend>
        <div role="radiogroup" aria-label={label ?? "Years"} className="flex flex-wrap gap-1">
          {stops.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={s.id === current.id} onClick={() => onChange(s.id)} className={chip(s.id === current.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  const i = dated.findIndex((s) => s.id === current.id);
  const onSummary = current === summary;
  // The slider rests at the newest year while the summary is shown, with its thumb hidden.
  const pos = i >= 0 ? i : dated.length - 1;
  const last = dated.length - 1;
  const shown = scrub ?? pos;
  const commit = (k: number) => { clearTimeout(timer.current); setScrub(null); if (onSummary || k !== i) onChange(dated[k].id); };
  const scrubTo = (k: number) => {
    if (!held.current) return commit(k); // keys and taps land at once
    setScrub(k);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => (onSummary || k !== i) && onChange(dated[k].id), 150);
  };
  const release = (e: PointerEvent<HTMLInputElement>) => { if (held.current) { held.current = false; commit(+e.currentTarget.value); } };
  const big = scrub !== null || !onSummary ? dated[shown].label : current.label;
  const step = (d: number) => onChange(dated[Math.min(last, Math.max(0, (onSummary ? dated.length : pos) + d))].id);
  const btn = `grid size-7 shrink-0 place-items-center rounded-md text-foreground disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-ring ${docked ? "wg-panel" : "hover:bg-muted"}`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold" id="time-label">{label ?? (summary ? "Show" : "Year")}</span>
        <span className="text-2xl leading-none font-semibold tabular-nums" aria-live="polite">
          <span key={big} className="inline-block animate-in fade-in slide-in-from-bottom-1 duration-150">{big}</span>
        </span>
      </div>
      {summary && (
        <div role="radiogroup" aria-label="Show" className="flex flex-wrap gap-1">
          <button type="button" role="radio" aria-checked={!onSummary} onClick={() => onSummary && onChange(dated[last].id)} className={chip(!onSummary)}>One year</button>
          <button type="button" role="radio" aria-checked={onSummary} onClick={() => onChange(summary.id)} className={chip(onSummary)}>{summary.label}</button>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => step(-1)} disabled={!onSummary && pos === 0} aria-label="Previous year" className={btn}><ChevronLeft className="size-4" aria-hidden /></button>
        <div className="wg-notches relative min-w-0 flex-1" data-off={(onSummary && scrub === null) || undefined}>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0" aria-hidden>
            {dated.map((s, k) => (
              <span key={s.id} data-notch={s.id} className={`wg-notch ${k === shown && (scrub !== null || !onSummary) ? "wg-notch-on" : ""}`} style={{ left: `calc(0.5rem + (100% - 1rem) * ${last ? k / last : 0})` }} />
            ))}
          </div>
          <input type="range" min={0} max={last} step={1} value={shown} aria-label="Year"
            aria-valuetext={big}
            // Capture so the release lands here even when the pointer leaves the slider.
            onPointerDown={(e) => { held.current = true; e.currentTarget.setPointerCapture(e.pointerId); }}
            onLostPointerCapture={release}
            onChange={(e) => scrubTo(+e.target.value)}
            className="wg-range relative w-full" />
        </div>
        <button type="button" onClick={() => step(1)} disabled={onSummary || pos === last} aria-label="Next year" className={btn}><ChevronRight className="size-4" aria-hidden /></button>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums text-muted-foreground">
        <span>{dated[0].label}</span>
        <span>{dated[last].label}</span>
      </div>
    </div>
  );
}
