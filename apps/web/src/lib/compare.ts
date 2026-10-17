// Compare places side by side (roadmap 1.1, issue #117, D-258): the route, the level rules and
// the test of a difference. Pure functions, so the page, the picker and the unit tests share them.
import { formatValue, isGradable, type GeoLevel, type Unit } from "@webgis/design";
import { searchPlaces, type PlaceHit, type PlaceRow } from "./search";

// ── Route ──────────────────────────────────────────────────────────────────────
// /compare/<geoid A>/<geoid B>?d=<dataset id>. A is the place the visitor started from, B the one
// they picked; d is the metric they were viewing (it leads the page).

export interface CompareState { a: string; b: string; d: string | null }

/** Levels a comparison works at, by GEOID length. Tract is the finest (block groups compare as their tract). */
const COMPARE_LENGTHS = new Set([2, 5, 11]);

export function compareHref({ a, b, d }: CompareState): string {
  return `/compare/${a}/${b}${d ? `?d=${encodeURIComponent(d)}` : ""}`;
}

/** The route's params back into a state; null when they can't make a comparison (different
 *  levels, the same place twice, or a level finer than tract). */
export function parseCompare(a: string, b: string, search: string | URLSearchParams): CompareState | null {
  if (!/^\d+$/.test(a) || !/^\d+$/.test(b) || a === b || a.length !== b.length || !COMPARE_LENGTHS.has(a.length)) return null;
  const d = new URLSearchParams(search).get("d");
  return { a, b, d: d && /^[a-z0-9_]{1,64}$/.test(d) ? d : null };
}

/** The place a comparison uses for a clicked place: itself for states, counties and tracts; the
 *  tract it sits in for block groups and blocks. Null for anything else. */
export function compareGeoid(geoid: string, level: GeoLevel): string | null {
  if (level === "state" || level === "county" || level === "tract") return geoid;
  if (level === "block_group" || level === "block") return geoid.slice(0, 11);
  return null;
}

/** Robbie (2026-10-09): visitors only see what works for the feature they're using. "Compare with…"
 *  is offered only for a choropleth map (not roads or points) that has values at the compare level
 *  (state, county, or the tract a block group or block sits in), in its default period (the
 *  details files hold only that one), when place A has a value. `aValue` undefined = not known yet
 *  (block groups: the tract's value isn't loaded in the panel). */
export function canCompare(ds: { measure: { kind: string }; geographyLevels: readonly string[] }, level: GeoLevel,
  opts: { otherPeriod?: boolean; aValue?: number | null } = {}): boolean {
  if (ds.measure.kind === "features" || opts.otherPeriod || opts.aValue === null) return false;
  const at = level === "block_group" || level === "block" ? "tract" : level;
  return (at === "state" || at === "county" || at === "tract") && ds.geographyLevels.includes(at);
}

/** A row on the compare page only when both places have a value (no "No data" rows). */
export const bothHave = (a: Estimate | undefined, b: Estimate | undefined) =>
  a?.value != null && b?.value != null && Number.isFinite(a.value) && Number.isFinite(b.value);

/** "Hennepin County, MN" → "Hennepin County"; "Census tract 1032, Hennepin County, MN" → "Census tract 1032". */
export const shortName = (name: string) => name.split(",")[0];

// ── Picking place B ────────────────────────────────────────────────────────────
// States and counties come from the search index (geo/search.json). Cities, towns, boroughs and
// villages are in it too but have no map data, so they're dropped. Tracts aren't in it at all:
// a tract is picked by tapping it on the map.

const KIND: Partial<Record<GeoLevel, string>> = { state: "State", county: "County" };

/** Search only places at `level` (state or county), leaving out place A. */
export function searchAtLevel(rows: PlaceRow[], q: string, level: GeoLevel, exclude: string, limit = 8): PlaceHit[] {
  const kind = KIND[level];
  if (!kind) return [];
  return searchPlaces(rows.filter((r) => r[1] === kind && r[2] !== exclude), q, limit);
}

// ── The difference ─────────────────────────────────────────────────────────────

export interface Estimate { value: number | null; moe: number | null }

/**
 * Is the gap between two ACS estimates statistically clear at 90% confidence? (ACS margins of error
 * are at 90%: margin = 1.645 × standard error.)
 *
 *   SE = MOE / 1.645 for each estimate; SE of the difference = √(SE_A² + SE_B²);
 *   clear when |A − B| / SE_diff > 1.645, i.e. |A − B| > √(MOE_A² + MOE_B²).
 *
 * (The Census Bureau's test for two independent estimates; the 1.645s cancel.) Null when it can't
 * be tested: a value or a margin is missing.
 */
export function gapIsClear(a: Estimate, b: Estimate): boolean | null {
  if (a.value == null || b.value == null || a.moe == null || b.moe == null) return null;
  if (!Number.isFinite(a.moe) || !Number.isFinite(b.moe) || a.moe < 0 || b.moe < 0) return null;
  // |A − B| / (√(MOE_A² + MOE_B²) / 1.645) > 1.645, with the 1.645s cancelled so the boundary is exact.
  return Math.abs(a.value - b.value) > Math.hypot(a.moe, b.moe);
}

export type Verdict =
  /** One or both values are missing. */
  | { kind: "missing" }
  | { kind: "same" }
  /** Survey estimates whose gap is within the margins of error. */
  | { kind: "about_same" }
  /** `higher`: which place is higher. `tested`: a survey gap that passed the test (false = no test, e.g. CDC PLACES). */
  | { kind: "higher"; higher: "a" | "b"; gap: number; tested: boolean };

/** Compare one metric for two places. Only ACS estimates (`isGradable`) are tested; others get the plain difference. */
export function compareValues(measureKind: string, a: Estimate, b: Estimate): Verdict {
  if (a.value == null || b.value == null || !Number.isFinite(a.value) || !Number.isFinite(b.value)) return { kind: "missing" };
  if (a.value === b.value) return { kind: "same" };
  const clear = isGradable(measureKind) ? gapIsClear(a, b) : null;
  if (clear === false) return { kind: "about_same" };
  return { kind: "higher", higher: a.value > b.value ? "a" : "b", gap: Math.abs(a.value - b.value), tested: clear === true };
}

const nf1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** The size of a gap in plain words: "3.1 points" for percentages and percentiles, else the unit's own format ("$4,210"). */
export function gapText(gap: number, unit: Unit): string {
  if (unit === "percent" || unit === "percentile") return `${nf1.format(gap)} ${gap === 1 ? "point" : "points"}`;
  return formatValue(gap, unit);
}

/** The headline sentence: "Hennepin County is 3.1 points higher", "About the same", … */
export function verdictText(v: Verdict, unit: Unit, names: { a: string; b: string }): string {
  if (v.kind === "missing") return "Not available for both places";
  if (v.kind === "same") return "The same";
  if (v.kind === "about_same") return "About the same";
  return `${v.higher === "a" ? names.a : names.b} is ${gapText(v.gap, unit)} higher`;
}

/** A row's short verdict: "Hennepin County higher", "About the same", "Same", or "" when a value is missing. */
export function rowVerdictText(v: Verdict, names: { a: string; b: string }): string {
  if (v.kind === "missing") return "";
  if (v.kind === "same") return "Same";
  if (v.kind === "about_same") return "About the same";
  return `${v.higher === "a" ? names.a : names.b} higher`;
}

// ── The strip of every place (issue #231) ──────────────────────────────────────

/** The strip's range: the 1st to 99th percentile of every place's value, so a lone outlier
 *  doesn't squash the pack into a corner (values outside sit at the ends). `clipped*`: an end was cut. */
export function stripRange(all: number[]): { lo: number; hi: number; clippedLo: boolean; clippedHi: boolean } | null {
  const v = all.filter(Number.isFinite).sort((x, y) => x - y);
  if (v.length < 2) return null;
  const lo = v[Math.floor(0.01 * (v.length - 1))], hi = v[Math.ceil(0.99 * (v.length - 1))]; // under 101 places (states): the full range
  if (!(hi > lo)) return null;
  return { lo, hi, clippedLo: v[0] < lo, clippedHi: v[v.length - 1] > hi };
}

/** A value's place along the strip, 0 to 1. */
export const stripX = (v: number, r: { lo: number; hi: number }) => Math.min(1, Math.max(0, (v - r.lo) / (r.hi - r.lo)));
