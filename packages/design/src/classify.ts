// Classification methods. All return the n-1 interior break values; class i covers
// [breaks[i-1], breaks[i]) with open ends at the data min and max.
import { ckmeans, quantileSorted } from "simple-statistics";

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
  if (opts.method === "equalInterval") {
    const lo = v[0], hi = v[v.length - 1];
    return Array.from({ length: n - 1 }, (_, i) => lo + ((hi - lo) * (i + 1)) / n);
  }
  if (opts.method === "quantile") {
    const q = dedupe(Array.from({ length: n - 1 }, (_, i) => quantileSorted(v, (i + 1) / n)));
    if (q[0] > v[0]) return q;
    // Skewed data (e.g. most tracts at exactly 0% transit) puts a break on the minimum,
    // leaving an empty "< min" class. Instead: class 0 = exactly the minimum value,
    // and the other n-1 classes are quantiles of the values above it.
    const rest = v.filter((x) => x > v[0]);
    if (rest.length === 0) return [];
    const k = n - 1;
    return dedupe([rest[0], ...Array.from({ length: k - 1 }, (_, i) => quantileSorted(rest, (i + 1) / k))]);
  }
  // Jenks natural breaks via Ckmeans (optimal 1-D k-means, same objective).
  const k = Math.min(n, new Set(v).size);
  return ckmeans(v, k).slice(1).map((cluster) => cluster[0]);
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
