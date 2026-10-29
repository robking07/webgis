// Classification methods. All return the n-1 interior break values; class i covers
// [breaks[i-1], breaks[i]) with open ends at the data min and max.
import { ckmeans, quantileSorted } from "simple-statistics";
import { RAMPS, rampColors, type RampId } from "./ramps.ts";

export type ClassMethod = "quantile" | "equalInterval" | "jenks" | "manual";

export interface ClassifyOptions {
  method: ClassMethod;
  classes: number;
  /** Required for `manual`: the n-1 interior breaks. */
  breaks?: number[];
}

export function classify(values: number[], opts: ClassifyOptions): number[] {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  const n = opts.classes;
  if (opts.method === "manual") {
    if (!opts.breaks || opts.breaks.length !== n - 1) {
      throw new Error(`manual classification needs ${n - 1} breaks`);
    }
    return [...opts.breaks];
  }
  if (v.length === 0) return [];
  const lo = v[0], hi = v[v.length - 1];
  if (opts.method === "equalInterval") {
    return niceBreaks(Array.from({ length: n - 1 }, (_, i) => lo + ((hi - lo) * (i + 1)) / n), lo, hi);
  }
  if (opts.method === "quantile") {
    const q = dedupe(Array.from({ length: n - 1 }, (_, i) => quantileSorted(v, (i + 1) / n)));
    if (q[0] > v[0]) return niceBreaks(q, lo, hi);
    // Skewed data (e.g. most tracts at exactly 0% transit) puts a break on the minimum,
    // leaving an empty "< min" class. Instead: class 0 = exactly the minimum value,
    // and the other n-1 classes are quantiles of the values above it.
    const rest = v.filter((x) => x > v[0]);
    if (rest.length === 0) return [];
    const k = n - 1;
    const b = dedupe([rest[0], ...Array.from({ length: k - 1 }, (_, i) => quantileSorted(rest, (i + 1) / k))]);
    // The first break stays exact: it is what keeps the bottom class to exactly the minimum.
    return [b[0], ...niceBreaks(b.slice(1), b[0], hi)];
  }
  // Jenks natural breaks via Ckmeans (optimal 1-D k-means, same objective).
  const k = Math.min(n, new Set(v).size);
  return niceBreaks(ckmeans(v, k).slice(1).map((cluster) => cluster[0]), lo, hi);
}

/** Breaks rounded to the fewest significant figures (at least `minSig`, default 2) that keep them in order, distinct
 *  and inside (lo, hi], so no class goes empty: $69,820 → $70,000, 9.31% → 9.3% (D-429). The map
 *  paints with these same breaks, so every place still matches the legend row its value falls in. */
export function niceBreaks(breaks: number[], lo: number, hi: number, minSig = 2): number[] {
  for (let s = minSig; s <= 15; s++) {
    const r = breaks.map((x) => Number(x.toPrecision(s)));
    if (r.every((x, i) => x > (i ? r[i - 1] : lo) && x <= hi)) return r;
  }
  return breaks;
}

/** Index of the class a value falls in, given interior breaks. */
export function classOf(value: number, breaks: number[]): number {
  let i = 0;
  while (i < breaks.length && value >= breaks[i]) i++;
  return i;
}

function dedupe(b: number[]): number[] {
  return b.filter((x, i) => i === 0 || x > b[i - 1]);
}

/** A level's classes from a dataset's registry symbology and the token ramps: one class per value,
 *  parallel to `vals`. `breaksFrom`: compute the breaks from these values instead (D-36).
 *  `breaks`: use these breaks as they are (block groups take the tract breaks, issue #325).
 *  `minClass` is set when the bottom class holds exactly the minimum (heavily skewed data).
 *  Plain arrays in and out, so the values worker (issue #28) and the main thread share it. */
export function classifyValues(
  sym: { ramp: string; classification: ClassMethod; classes: number; breaks?: number[] },
  vals: ArrayLike<number>,
  breaksFrom?: number[],
  fixed?: number[],
): { colors: string[]; breaks: number[]; cls: Uint8Array; minClass?: number } {
  const r = RAMPS[sym.ramp as RampId];
  const n = Math.min(Math.max(sym.classes, r.minClasses), r.maxClasses);
  const breaks = fixed ?? classify(breaksFrom ?? Array.from(vals), { method: sym.classification, classes: n, breaks: sym.breaks });
  const colors = rampColors(sym.ramp as RampId, breaks.length + 1);
  const cls = new Uint8Array(vals.length);
  let min = Infinity, bottomAllMin = true;
  for (let i = 0; i < vals.length; i++) if (vals[i] < min) min = vals[i];
  for (let i = 0; i < vals.length; i++) {
    cls[i] = classOf(vals[i], breaks);
    if (cls[i] === 0 && vals[i] !== min) bottomAllMin = false;
  }
  return { colors, breaks, cls, minClass: breaks.length && bottomAllMin ? min : undefined };
}
