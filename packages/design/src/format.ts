// Number formatting and legend rules, keyed by the `unit` field of a registry entry.

export type Unit = "dollars" | "percent" | "minutes" | "count" | "per_sq_mi" | "ratio" | "years" | "deg_f" | "inches" | "per_100k" | "vehicles_per_day";

const nf = (o: Intl.NumberFormatOptions) => new Intl.NumberFormat("en-US", o);
const FORMATTERS: Record<Unit, (v: number) => string> = {
  dollars: (v) => nf({ style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v),
  percent: (v) => `${nf({ maximumFractionDigits: Math.abs(v) < 1 && v !== 0 ? 2 : Math.abs(v) < 10 ? 1 : 0 }).format(v)}%`,
  minutes: (v) => `${nf({ maximumFractionDigits: 1 }).format(v)} min`,
  count: (v) => nf({ notation: v >= 1e5 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v),
  per_sq_mi: (v) => `${nf({ maximumFractionDigits: v < 10 ? 1 : 0 }).format(v)}/sq mi`,
  ratio: (v) => nf({ maximumFractionDigits: 2 }).format(v),
  years: (v) => `${nf({ maximumFractionDigits: 1 }).format(v)} yr`,
  deg_f: (v) => `${nf({ maximumFractionDigits: 1 }).format(v)}°F`,
  inches: (v) => `${nf({ maximumFractionDigits: 1 }).format(v)} in`,
  vehicles_per_day: (v) => `${nf({ notation: v >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v)} vehicles/day`,
  per_100k: (v) => `${nf({ maximumFractionDigits: 1 }).format(v)} per 100k`,
};

export function formatValue(v: number | null | undefined, unit: Unit): string {
  if (v == null || !Number.isFinite(v)) return "No data";
  return FORMATTERS[unit](v);
}

export const LEGEND = {
  /** Default number of classes for a choropleth. */
  defaultClasses: 5,
  defaultMethod: "quantile" as const,
  swatchSize: 16,
  noDataLabel: "No data",
  /** Always show the no-data swatch, so gaps never read as a low value. */
  alwaysShowNoData: true,
};

/** Human-readable class labels: "< a", "a – b", …, "≥ z". */
export function classLabels(breaks: number[], unit: Unit, opts?: { min?: number; minIsClass?: boolean }): string[] {
  if (breaks.length === 0) return ["All values"];
  const f = (v: number) => formatValue(v, unit);
  /** "10.9 – 15.9 per 100k", not "10.9 per 100k – 15.9 per 100k": drop a multi-character
   *  unit suffix from the lower bound when the upper bound carries it. */
  const range = (a: number, b: number) => {
    const fa = f(a), fb = f(b);
    const suffix = fb.match(/^[^\d]*[\d.,]+(.*)$/)?.[1] ?? ""; // everything after the leading number
    return `${suffix.trim().length > 1 && fa.endsWith(suffix) ? fa.slice(0, -suffix.length) : fa} – ${fb}`;
  };
  const min = opts?.min;
  if (min != null && breaks[0] > min && opts?.minIsClass) {
    // Bottom class holds exactly the minimum (see classify: mass at the minimum).
    return [f(min), ...breaks.slice(1).map((b, i) => (i === 0 ? `> ${f(min)} – ${f(b)}` : range(breaks[i], b))), `≥ ${f(breaks[breaks.length - 1])}`];
  }
  return [
    `< ${f(breaks[0])}`,
    ...breaks.slice(1).map((b, i) => range(breaks[i], b)),
    `≥ ${f(breaks[breaks.length - 1])}`,
  ];
}
