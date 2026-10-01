// Year control (D-36): step the map through a dataset's timeline stops. A few stops are a
// segmented row; many (single years) are a slider with step buttons, and an average or normal
// that isn't a moment in time gets its own chip.
"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Stop } from "@/lib/periods";

const DATED = /^\d{4}$/;

export function TimeControl({ stops, value, onChange, docked }: {
  stops: Stop[];
  /** Selected stop id. */
  value: string;
  onChange: (id: string) => void;
  /** Immersed dock: transparent, text halos. */
  docked?: boolean;
}) {
  const current = stops.find((s) => s.id === value) ?? stops.find((s) => s.isDefault)!;
  const summary = stops.find((s) => s.isDefault && !DATED.test(s.id));
  const dated = stops.filter((s) => s !== summary);
  const chip = (on: boolean) =>
    `rounded-md px-2 py-1 text-xs font-medium tabular-nums focus-visible:outline-2 focus-visible:outline-ring ${on ? "bg-primary text-primary-foreground" : docked ? "wg-glass text-foreground" : "border hover:bg-muted"}`;

  if (stops.length <= 4) {
    return (
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-semibold">Years</legend>
        <div role="radiogroup" aria-label="Years" className="flex flex-wrap gap-1">
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
  // The slider rests at the newest year while the summary is shown.
  const pos = i >= 0 ? i : dated.length - 1;
  const step = (d: number) => onChange(dated[Math.min(dated.length - 1, Math.max(0, (onSummary ? dated.length : pos) + d))].id);
  const btn = `grid size-7 shrink-0 place-items-center rounded-md text-foreground disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-ring ${docked ? "wg-glass" : "hover:bg-muted"}`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold" id="time-label">Year</span>
        <span className="text-sm font-semibold tabular-nums" aria-live="polite">{current.label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => step(-1)} disabled={!onSummary && pos === 0} aria-label="Previous year" className={btn}><ChevronLeft className="size-4" aria-hidden /></button>
        <input type="range" min={0} max={dated.length - 1} step={1} value={pos} aria-labelledby="time-label"
          aria-valuetext={onSummary ? summary!.label : dated[pos].label}
          onChange={(e) => onChange(dated[+e.target.value].id)}
          className={`wg-range min-w-0 flex-1 ${onSummary ? "opacity-50" : ""}`} />
        <button type="button" onClick={() => step(1)} disabled={onSummary || pos === dated.length - 1} aria-label="Next year" className={btn}><ChevronRight className="size-4" aria-hidden /></button>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums text-muted-foreground">
        <span>{dated[0].label}</span>
        {summary && (
          <button type="button" aria-pressed={onSummary} onClick={() => onChange(summary.id)} className={chip(onSummary)}>
            {summary.label}
          </button>
        )}
        <span>{dated[dated.length - 1].label}</span>
      </div>
    </div>
  );
}
