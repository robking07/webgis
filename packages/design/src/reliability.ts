// Reliability of survey estimates (issue #97, D-<see decision file>): ACS margins of error graded
// by coefficient of variation, the Census Bureau's standard measure.
//
//   CV = (MOE / 1.645) / |value| × 100    (ACS margins are at 90% confidence)
//
// Cut-offs (Robbie, 2026-10-06): under 15% reliable; 15–30% "use with caution" (a note in the
// details panel, never hatched); over 30% unreliable (hatched when the map's toggle is on, and a note).

export type Reliability = "reliable" | "caution" | "unreliable";

export const RELIABILITY = {
  /** z for a 90% margin of error (ACS). */
  z90: 1.645,
  /** CV at or above this (percent) is "use with caution". */
  cautionCv: 15,
  /** CV above this (percent) is unreliable. */
  unreliableCv: 30,
} as const;

/** Coefficient of variation in percent, or null when it can't be computed: no value, a value of
 *  0 (CV is undefined), or no margin of error. */
export function coefficientOfVariation(value: number | null | undefined, moe: number | null | undefined): number | null {
  if (value == null || moe == null || !Number.isFinite(value) || !Number.isFinite(moe) || value === 0 || moe < 0) return null;
  return (moe / RELIABILITY.z90) / Math.abs(value) * 100;
}

/** The grade of one estimate; null = not graded (see coefficientOfVariation). */
export function gradeEstimate(value: number | null | undefined, moe: number | null | undefined): Reliability | null {
  const cv = coefficientOfVariation(value, moe);
  if (cv == null) return null;
  if (cv > RELIABILITY.unreliableCv) return "unreliable";
  if (cv >= RELIABILITY.cautionCv) return "caution";
  return "reliable";
}

/** Only ACS 5-year estimates carry a margin of error we grade. PLACES' "±" is a 95% interval, and
 *  census counts, LODES and the rest have none. */
export function isGradable(measureKind: string | null | undefined): boolean {
  return measureKind === "acs5";
}
