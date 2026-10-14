// Number formatting and legend rules, keyed by the `unit` field of a registry entry.

export type Unit = "dollars" | "percent" | "minutes" | "count" | "per_sq_mi" | "ratio" | "years" | "deg_f" | "inches" | "per_100k" | "vehicles_per_day" | "miles_per_day" | "categories" | "agreements" | "declarations" | "percentile" | "ug_m3" | "ppm" | "degree_days";

const nf = (o: Intl.NumberFormatOptions) => new Intl.NumberFormat("en-US", o);
/** Default decimals for the units whose precision depends on the value (margins reuse these). */
const DECIMALS: Partial<Record<Unit, (v: number) => number>> = {
  // Cents only for small amounts (per-resident hazard losses run from a few cents up).
  dollars: (v) => (Math.abs(v) < 10 && v !== 0 ? 2 : 0),
  percent: (v) => (Math.abs(v) < 1 && v !== 0 ? 2 : Math.abs(v) < 10 ? 1 : 0),
  ratio: () => 3,
};
const FORMATTERS: Record<Unit, (v: number, d: number) => string> = {
  dollars: (v, d) => nf({ style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d }).format(v),
  percent: (v, d) => `${nf({ maximumFractionDigits: d }).format(v)}%`,
  minutes: (v) => `${nf({ maximumFractionDigits: 1 }).format(v)} min`,
  count: (v) => nf({ notation: v >= 1e5 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v),
  per_sq_mi: (v) => `${nf({ maximumFractionDigits: v < 10 ? 1 : 0 }).format(v)}/sq mi`,
  ratio: (v, d) => nf({ maximumFractionDigits: d }).format(v),
  years: (v) => `${nf({ maximumFractionDigits: 1 }).format(v)} yr`,
  deg_f: (v) => `${nf({ maximumFractionDigits: 1 }).format(v)}°F`,
  inches: (v) => `${nf({ maximumFractionDigits: 1 }).format(v)} in`,
  vehicles_per_day: (v) => `${nf({ notation: v >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v)} vehicles/day`,
  categories: (v) => `${nf({ maximumFractionDigits: 0 }).format(v)} ${Math.round(v) === 1 ? "category" : "categories"}`,
  agreements: (v) => `${nf({ maximumFractionDigits: 0 }).format(v)} ${Math.round(v) === 1 ? "agreement" : "agreements"}`,
  declarations: (v) => `${nf({ maximumFractionDigits: 0 }).format(v)} ${Math.round(v) === 1 ? "declaration" : "declarations"}`,
  miles_per_day: (v) => `${nf({ maximumFractionDigits: 1 }).format(v)} mi/day`,
  per_100k: (v) => `${nf({ maximumFractionDigits: 1 }).format(v)} per 100k`,
  ug_m3: (v) => `${nf({ minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v)} µg/m³`,
  ppm: (v) => `${nf({ minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v)} ppm`,
  percentile: (v) => (Math.round(v) >= 99 ? "top 1%" : `${ordinal(Math.max(1, Math.round(v)))} percentile`),
  degree_days: (v) => `${nf({ maximumFractionDigits: 0 }).format(v)} degree days`,
};

function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
}

/** Units whose values are whole-number counts. */
const INTEGER_UNITS = new Set<Unit>(["count", "categories", "agreements", "declarations", "percentile"]);

/** Units in words, for profile pages and screen readers. */
export const UNIT_LABEL: Record<Unit, string> = {
  dollars: "U.S. dollars", percent: "percent", minutes: "minutes", count: "count", per_sq_mi: "per square mile of land",
  ratio: "ratio", years: "years", deg_f: "degrees Fahrenheit", inches: "inches", per_100k: "per 100,000 residents",
  vehicles_per_day: "vehicles per day", miles_per_day: "miles per day", categories: "burden categories exceeded", agreements: "active agreements", declarations: "disaster declarations", percentile: "percentile (national rank)",
  ug_m3: "micrograms per cubic meter of air", ppm: "parts per million",
  degree_days: "degree days (°F)",
};

/** `plain` skips the "less than 1¢" wording (legend labels). `decimals` overrides the default precision. */
export function formatValue(v: number | null | undefined, unit: Unit, opts?: { decimals?: number; plain?: boolean }): string {
  if (v == null || !Number.isFinite(v)) return "No data";
  if (unit === "dollars" && !opts?.plain && v !== 0 && Math.abs(v) < 0.01) return "less than 1¢";
  return FORMATTERS[unit](v, opts?.decimals ?? DECIMALS[unit]?.(v) ?? 0);
}

/** A value and its margin of error, rounded together: the margin is never shown more precisely than
 *  the value, and never as "±0". `moe` is null when there is nothing honest to add (no margin, or an
 *  exact count with a margin of 0). shortcut: only dollars, percent and ratio adjust precision; other
 *  units use their usual format for both, which already matches. */
export function formatEstimate(v: number | null | undefined, moe: number | null | undefined, unit: Unit): { value: string; moe: string | null } {
  const value = formatValue(v, unit);
  const dec = DECIMALS[unit];
  if (v == null || !Number.isFinite(v) || moe == null || !Number.isFinite(moe) || moe <= 0 || value.startsWith("less than")) return { value, moe: null };
  // Counts with a margin read in full ("123,902 ±4,816"); compact "123.9K" would out-round the margin.
  if (unit === "count") { const full = nf({ maximumFractionDigits: 0 }).format; return { value: full(v), moe: full(moe) }; }
  if (!dec) return { value, moe: formatValue(moe, unit) };
  // Percent carries one decimal when the margin needs it ("19.8% ±1.9%", not "20% ±1.9%").
  const d = unit === "percent" ? Math.min(Math.max(dec(v), dec(moe)), Math.abs(v) < 1 ? 2 : 1) : dec(v);
  return { value: formatValue(v, unit, { decimals: d }), moe: formatValue(Math.max(moe, 10 ** -d), unit, { decimals: d }) };
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
  const f = (v: number) => formatValue(v, unit, { plain: true, decimals: unit === "ratio" ? 2 : undefined }); // legends keep ratios at 2 decimals
  /** "10.9 – 15.9 per 100k", not "10.9 per 100k – 15.9 per 100k": drop a multi-character
   *  unit suffix from the lower bound when the upper bound carries it. */
  const range = (a: number, b: number) => {
    const fa = f(a), fb = f(b);
    const suffix = fb.match(/^[^\d]*[\d.,]+(.*)$/)?.[1] ?? ""; // everything after the leading number
    return `${suffix.trim().length > 1 && fa.endsWith(suffix) ? fa.slice(0, -suffix.length) : fa} – ${fb}`;
  };
  // Whole-number counts (agreements, categories…): exact inclusive ranges, e.g.
  // "0 agreements", "1 agreement", "2–3 agreements", "4–7 agreements", "8 or more agreements".
  if (INTEGER_UNITS.has(unit) && breaks.length && breaks.every(Number.isInteger)) {
    const n = (v: number) => nf({ maximumFractionDigits: 0 }).format(v);
    const lo0 = opts?.min ?? 0;
    const cls = [[lo0, breaks[0] - 1], ...breaks.slice(1).map((b, i) => [breaks[i], b - 1])];
    return [
      ...cls.map(([lo, hi]) => (lo >= hi ? f(hi) : `${n(lo)}–${f(hi)}`)),
      `${n(breaks[breaks.length - 1])} or more ${f(breaks[breaks.length - 1]).replace(/^[\d,.]+\s*/, "").replace(/^agreement$/, "agreements").replace(/^declaration$/, "declarations").replace(/^category$/, "categories")}`,
    ];
  }
  // Whole-number steps of 1 (e.g. 0–8 categories): label each class with its exact value.
  if (breaks.length && breaks.every((b, i) => Number.isInteger(b) && (i === 0 || b - breaks[i - 1] === 1)) && breaks[0] >= 1) {
    return [...breaks.map((b) => f(b - 1)), `≥ ${f(breaks[breaks.length - 1])}`];
  }
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
