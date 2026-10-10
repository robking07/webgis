// Change-over-time maps (issue #127): the change between two timeline stops, computed in the
// browser from the two stops' value files. Measure rule (Robbie, 2026-10-08): percentages change
// in percentage points, counts and other amounts in percent, everything else (rates, minutes,
// degrees…) as a plain difference in its own unit. When both stops' margins of error are known, a
// change within the margin of error of the difference is "no clear change" (the ramp's middle).
import { CHANGE_CLASSES, CHANGE_RAMP, formatValue, rampColors, UNIT_LABEL, type Unit } from "@webgis/design";
import type { Values } from "./values";

export type ChangeMeasure = "points" | "percent" | "difference";

/** Amounts, where "up 12%" reads naturally and a raw difference depends on the area's size. */
const PERCENT_CHANGE_UNITS = new Set<Unit>(["count", "per_sq_mi", "dollars", "vehicles_per_day", "miles_per_day"]);

export function changeMeasure(unit: Unit): ChangeMeasure {
  if (unit === "percent") return "points";
  return PERCENT_CHANGE_UNITS.has(unit) ? "percent" : "difference";
}

/** Change from `from` to `to`; null when either is missing, or a percent change has a zero base. */
export function changeOf(from: number | null | undefined, to: number | null | undefined, m: ChangeMeasure): number | null {
  if (from == null || to == null || !Number.isFinite(from) || !Number.isFinite(to)) return null;
  if (m !== "percent") return to - from;
  if (from === 0) return to === 0 ? 0 : null;
  return ((to - from) / Math.abs(from)) * 100;
}

/** Margin of error of `to − from`: √(MOE₁² + MOE₂²), the Census Bureau's approximation for a
 *  difference of two estimates. `fromMoe` unknown: assume the earlier estimate had the same
 *  relative margin as the later one (MOE₁ ≈ MOE₂ · |from / to|).
 *  shortcut: earlier periods publish no margins, so MOE₁ is estimated; use the real ones once the
 *  ingest exports `values/<id>/<stop>/<level>.moe.json`. */
export function differenceMoe(from: number, fromMoe: number | null | undefined, to: number, toMoe: number | null | undefined): number | null {
  if (toMoe == null || !Number.isFinite(toMoe)) return null;
  const m1 = fromMoe != null && Number.isFinite(fromMoe) ? fromMoe : to !== 0 ? toMoe * Math.abs(from / to) : toMoe;
  return Math.sqrt(m1 * m1 + toMoe * toMoe);
}

/** True when the change is inside the margin of error of the difference (no clear change). */
export function withinMoe(from: number, to: number, moe: number | null): boolean {
  return moe != null && Math.abs(to - from) <= moe;
}

const nf = (d: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

/** A change magnitude without its sign: "2.3 pts", "12%", "1.4°F". */
function magnitude(v: number, m: ChangeMeasure, unit: Unit): string {
  const a = Math.abs(v);
  if (m === "points") return `${nf(a < 10 ? 1 : 0).format(a)} pts`;
  if (m === "percent") return `${nf(a < 10 ? 1 : 0).format(a)}%`;
  return formatValue(a, unit);
}

/** "+2.3 pts", "−12%", "0 pts". */
export function formatChange(v: number | null | undefined, m: ChangeMeasure, unit: Unit): string {
  if (v == null || !Number.isFinite(v)) return "No data";
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${magnitude(v, m, unit)}`;
}

/** What the change is measured in, for the legend: "percentage points", "percent change", "degrees Fahrenheit". */
export function changeUnitWords(m: ChangeMeasure, unit: Unit): string {
  return m === "points" ? "percentage points" : m === "percent" ? "percent change" : UNIT_LABEL[unit];
}

export interface ChangeClassed {
  colors: string[];
  /** geoid → class: 0–2 down (largest first), 3 no clear change, 4–6 up. */
  classes: Map<string, number>;
  /** The legend's label for each class. */
  labels: string[];
  /** The legend strip's two ends ("−5.0 pts", "+5.0 pts"). */
  ends: [string, string];
  /** geoid → change (in the measure's unit). */
  change: Values;
  noData: "noDataChange";
  measure: ChangeMeasure;
  /** True when some areas were tested against their margin of error. */
  tested: boolean;
}

const MID = (CHANGE_CLASSES - 1) / 2;

/** Classes for a change map. Magnitudes split into thirds (same cut-offs for falls and rises, so
 *  equal changes look equally strong); the middle class is "no clear change": within the margin
 *  of error where margins are known (`toMoes`, optional `fromMoes`), otherwise exactly no change. */
export function classifyChange(from: Values, to: Values, unit: Unit, toMoes?: Values | null, fromMoes?: Values | null): ChangeClassed {
  const measure = changeMeasure(unit);
  const change: Values = {};
  const steady = new Set<string>();
  let tested = false;
  for (const [g, b] of Object.entries(to)) {
    const a = from[g];
    const c = changeOf(a, b, measure);
    if (c == null) continue;
    change[g] = c;
    const moe = toMoes ? differenceMoe(a, fromMoes?.[g], b, toMoes[g]) : null;
    if (moe != null) tested = true;
    if (c === 0 || withinMoe(a, b, moe)) steady.add(g);
  }
  // Cut-offs from every area's change (margins only move areas to the middle), so the legend
  // stays put while margins for more counties load.
  const mags = Object.values(change).filter((c) => c !== 0).map(Math.abs).sort((x, y) => x - y);
  const at = (p: number) => (mags.length ? mags[Math.floor(p * (mags.length - 1))] : 0);
  const m1 = at(1 / 3), m2 = at(2 / 3);
  const classes = new Map<string, number>();
  for (const [g, c] of Object.entries(change)) {
    if (steady.has(g)) { classes.set(g, MID); continue; }
    const step = Math.abs(c) >= m2 ? 3 : Math.abs(c) >= m1 ? 2 : 1;
    classes.set(g, c < 0 ? MID - step : MID + step);
  }
  const f = (v: number) => magnitude(v, measure, unit);
  /** "1.2–5.0 pts", not "1.2 pts–5.0 pts". */
  const range = (a: number, b: number) => {
    const fa = f(a), fb = f(b);
    const suffix = fb.replace(/^[^\d]*[\d.,]+/, "");
    return `${suffix && fa.endsWith(suffix) ? fa.slice(0, -suffix.length) : fa}–${fb}`;
  };
  const side = (word: string) => [`${word} ${f(m2)} or more`, `${word} ${range(m1, m2)}`, `${word} under ${f(m1)}`];
  const down = side("Down"), up = side("Up").reverse();
  return {
    colors: rampColors(CHANGE_RAMP, CHANGE_CLASSES),
    classes,
    labels: [...down, tested ? "No clear change" : "No change", ...up],
    ends: [`−${f(m2)}`, `+${f(m2)}`],
    change,
    noData: "noDataChange",
    measure,
    tested,
  };
}

// One classification per pair of loaded value objects (and margins), like classifyUnivariateCached (D-114).
const cache = new WeakMap<Values, WeakMap<Values, WeakMap<Values, ChangeClassed>>>();
const NO_MOES: Values = {};

export function classifyChangeCached(from: Values, to: Values, unit: Unit, toMoes?: Values | null): ChangeClassed {
  let byTo = cache.get(from);
  if (!byTo) cache.set(from, (byTo = new WeakMap()));
  let byMoes = byTo.get(to);
  if (!byMoes) byTo.set(to, (byMoes = new WeakMap()));
  let c = byMoes.get(toMoes ?? NO_MOES);
  if (!c) byMoes.set(toMoes ?? NO_MOES, (c = classifyChange(from, to, unit, toMoes)));
  return c;
}
