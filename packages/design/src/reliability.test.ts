import { describe, expect, it } from "vitest";
import { coefficientOfVariation, gradeEstimate, isGradable } from "./reliability.ts";

describe("coefficientOfVariation", () => {
  it("uses the 90% ACS margin (z = 1.645)", () => {
    expect(coefficientOfVariation(100, 16.45)).toBeCloseTo(10);
    expect(coefficientOfVariation(-100, 16.45)).toBeCloseTo(10);
  });
  it("is null when it can't be computed", () => {
    expect(coefficientOfVariation(0, 5)).toBeNull();
    expect(coefficientOfVariation(null, 5)).toBeNull();
    expect(coefficientOfVariation(10, null)).toBeNull();
    expect(coefficientOfVariation(10, undefined)).toBeNull();
    expect(coefficientOfVariation(NaN, 1)).toBeNull();
    expect(coefficientOfVariation(10, -1)).toBeNull();
  });
});

describe("gradeEstimate", () => {
  const moeFor = (value: number, cv: number) => (cv / 100) * value * 1.645;
  it("grades by the 15% / 30% cut-offs", () => {
    expect(gradeEstimate(50_000, moeFor(50_000, 5))).toBe("reliable");
    expect(gradeEstimate(50_000, moeFor(50_000, 14.9))).toBe("reliable");
    expect(gradeEstimate(50_000, moeFor(50_000, 15))).toBe("caution");
    expect(gradeEstimate(50_000, moeFor(50_000, 30))).toBe("caution");
    expect(gradeEstimate(50_000, moeFor(50_000, 30.1))).toBe("unreliable");
  });
  it("treats a zero margin as reliable", () => {
    expect(gradeEstimate(12, 0)).toBe("reliable");
  });
  it("doesn't grade missing margins, or zeros with a small margin", () => {
    expect(gradeEstimate(0, 3)).toBeNull();
    expect(gradeEstimate(0, 5)).toBeNull();
    expect(gradeEstimate(0, null)).toBeNull();
    expect(gradeEstimate(4, null)).toBeNull();
  });
  it("grades a zero with a margin over 5 unreliable (Loving County, TX bike commuting: 0% ± 57.7)", () => {
    expect(gradeEstimate(0, 57.69)).toBe("unreliable");
    expect(gradeEstimate(0, 5.01)).toBe("unreliable");
  });
  it("matches a real Hennepin tract (median income 64,450 ± 10,100: CV 9.5%)", () => {
    expect(gradeEstimate(64_450, 10_100)).toBe("reliable");
  });
});

describe("isGradable", () => {
  it("grades ACS 5-year only", () => {
    expect(isGradable("acs5")).toBe(true);
    for (const k of ["census2020", "places", "lodes", "fars", undefined, null]) expect(isGradable(k)).toBe(false);
  });
});
