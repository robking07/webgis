"use client";
// County scatter for one insight. Single series → no legend; the axis titles name
// both measures. Dense point cloud: small dots with transparency, hover picks the
// nearest point. Density units get a log axis.
import { useMemo, useRef, useState } from "react";
import { formatValue, type Unit } from "@webgis/design";
import type { Dataset } from "@/lib/registry";
import type { Values } from "@/lib/values";

interface Props {
  x: Dataset; y: Dataset; xv: Values; yv: Values; names?: Record<string, string>;
  width?: number; height?: number; compact?: boolean;
}

const PAD = { l: 56, r: 12, t: 10, b: 40 };

function scale(values: number[], unit: Unit, size: number, invert: boolean) {
  const log = unit === "per_sq_mi";
  const vs = values.filter((v) => (log ? v > 0 : Number.isFinite(v))).sort((a, b) => a - b);
  // Clip to the 0.5–99.5 percentile so a handful of extremes don't flatten the cloud.
  let lo = vs[Math.floor(vs.length * 0.005)] ?? 0, hi = vs[Math.ceil(vs.length * 0.995) - 1] ?? 1;
  if (log) { lo = Math.log10(lo); hi = Math.log10(hi); }
  const u = (v: number) => ((log ? Math.log10(Math.max(v, 1e-9)) : v) - lo) / (hi - lo || 1);
  const t = (v: number) => (invert ? size - u(v) * size : u(v) * size);
  /** Outside the plotted range: these points are left out (and counted), never pinned to the edge. */
  const out = (v: number) => (log && v <= 0) || u(v) < -1e-9 || u(v) > 1 + 1e-9;
  const ticks = log
    ? Array.from({ length: Math.floor(hi) - Math.ceil(lo) + 1 }, (_, i) => 10 ** (Math.ceil(lo) + i))
    : Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  return { t, ticks, log, out };
}

export function Scatter({ x, y, xv, yv, names, width = 560, height = 360, compact = false }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ g: string; px: number; py: number } | null>(null);
  const w = width - PAD.l - PAD.r, h = height - PAD.t - PAD.b;
  const pts = useMemo(() => Object.keys(xv).filter((g) => g in yv).map((g) => ({ g, x: xv[g], y: yv[g] })), [xv, yv]);
  const sx = useMemo(() => scale(pts.map((p) => p.x), x.unit, w, false), [pts, x.unit, w]);
  const sy = useMemo(() => scale(pts.map((p) => p.y), y.unit, h, true), [pts, y.unit, h]);
  const inRange = useMemo(() => pts.filter((p) => !sx.out(p.x) && !sy.out(p.y)), [pts, sx, sy]);
  const placed = useMemo(() => inRange.map((p) => ({ ...p, px: sx.t(p.x), py: sy.t(p.y) })), [inRange, sx, sy]);
  const hidden = pts.length - inRange.length;

  function onMove(e: React.PointerEvent) {
    if (compact) return;
    const box = ref.current!.getBoundingClientRect();
    const mx = ((e.clientX - box.left) / box.width) * width - PAD.l, my = ((e.clientY - box.top) / box.height) * height - PAD.t;
    let best = null as null | (typeof placed)[number], bd = 18 * 18;
    for (const p of placed) { const d = (p.px - mx) ** 2 + (p.py - my) ** 2; if (d < bd) { bd = d; best = p; } }
    setHover(best ? { g: best.g, px: best.px, py: best.py } : null);
  }

  const fmtTick = (v: number, unit: Unit) => (unit === "per_sq_mi" ? (v >= 1000 ? `${v / 1000}k` : String(v)) : formatValue(v, unit));
  return (
    <figure className="relative m-0">
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img"
        aria-label={`Scatter plot of ${pts.length} counties: ${x.title} (horizontal) against ${y.title} (vertical)`}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <g transform={`translate(${PAD.l},${PAD.t})`}>
          {!compact && sy.ticks.map((v) => (
            <g key={`y${v}`}>
              <line x1={0} x2={w} y1={sy.t(v)} y2={sy.t(v)} stroke="var(--ui-border)" strokeWidth={1} />
              <text x={-8} y={sy.t(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--ui-text-muted)">{fmtTick(v, y.unit)}</text>
            </g>
          ))}
          {!compact && sx.ticks.map((v) => (
            <text key={`x${v}`} x={sx.t(v)} y={h + 18} textAnchor="middle" fontSize={11} fill="var(--ui-text-muted)">{fmtTick(v, x.unit)}</text>
          ))}
          <line x1={0} x2={w} y1={h} y2={h} stroke="var(--ui-text-muted)" strokeWidth={1} />
          {placed.map((p) => (
            <circle key={p.g} cx={p.px} cy={p.py} r={compact ? 1.6 : 2.4} fill="var(--ui-accent)" fillOpacity={compact ? 0.35 : 0.4} />
          ))}
          {hover && (
            <circle cx={hover.px} cy={hover.py} r={5} fill="var(--ui-accent)" stroke="var(--ui-surface)" strokeWidth={2} />
          )}
          {!compact && (
            <>
              <text x={w / 2} y={h + 34} textAnchor="middle" fontSize={12} fill="var(--ui-text)">{x.title}{x.unit === "per_sq_mi" ? " (log scale)" : ""} →</text>
              <text transform={`translate(${-44},${h / 2}) rotate(-90)`} textAnchor="middle" fontSize={12} fill="var(--ui-text)">{y.title}{y.unit === "per_sq_mi" ? " (log scale)" : ""} →</text>
            </>
          )}
        </g>
      </svg>
      {!compact && hidden > 0 && (
        <figcaption className="mt-1 text-xs text-muted-foreground">
          {hidden} extreme {hidden === 1 ? "county lies" : "counties lie"} outside the plotted range (beyond the 0.5th–99.5th percentiles) and {hidden === 1 ? "isn't" : "aren't"} drawn; they are still counted in ρ.
        </figcaption>
      )}
      {hover && (
        <div className="pointer-events-none absolute rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: `${((hover.px + PAD.l) / width) * 100}%`, top: `${((hover.py + PAD.t) / height) * 100}%`, transform: "translate(10px, -110%)" }}>
          <p className="font-medium">{names?.[hover.g] ?? hover.g}</p>
          <p className="text-muted-foreground">{x.title}: <span className="text-foreground">{formatValue(xv[hover.g], x.unit)}</span></p>
          <p className="text-muted-foreground">{y.title}: <span className="text-foreground">{formatValue(yv[hover.g], y.unit)}</span></p>
        </div>
      )}
    </figure>
  );
}
