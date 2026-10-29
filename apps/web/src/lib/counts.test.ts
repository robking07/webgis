import { describe, expect, it } from "vitest";
import { countsLabels, PARTS, parentsOf, partsOf, regionCounties, shareOf, sumCounts, type Counts } from "./counts";

describe("an MPO's total (#292)", () => {
  // Worked example: people below the poverty line in the Met Council's 7 counties (ACS 2020–2024,
  // values/pct_poverty/county.counts.json): Anoka, Carver, Dakota, Hennepin, Ramsey, Scott, Washington.
  const metro: Counts[] = [
    [25759, 2099, 366968, 301], [4817, 688, 108941, 268], [25893, 1769, 442814, 367], [123902, 4816, 1245143, 861],
    [65292, 4212, 529185, 508], [7034, 1045, 152827, 213], [13989, 1650, 273029, 229],
  ];
  it("adds estimates and combines margins as √Σ MOE²", () => {
    const [x, mx, y, my] = sumCounts(metro)!;
    expect(x).toBe(266686);
    expect(y).toBe(3118907);
    expect(mx).toBeCloseTo(Math.sqrt(2099 ** 2 + 688 ** 2 + 1769 ** 2 + 4816 ** 2 + 4212 ** 2 + 1045 ** 2 + 1650 ** 2), 6);
    expect(mx!).toBeCloseTo(7263.5, 1);
    expect(my!).toBeCloseTo(1180.8, 1);
    // The area's rate is the proportion of the sums: 8.55% ±0.23 points.
    const s = shareOf(x, mx, y, my)!;
    expect(s.share).toBeCloseTo(8.5506, 3);
    expect(s.moe!).toBeCloseTo(0.2329, 3);
  });
  it("never totals short a county, and keeps full counts margin-free", () => {
    expect(sumCounts([metro[0], null])).toBeNull();
    expect(sumCounts([metro[0], [null, null, 5, 1]])).toBeNull();
    expect(sumCounts([])).toBeNull();
    expect(sumCounts([[10, null, null, null], [5, null, null, null]])).toEqual([15, null, null, null]);
    expect(sumCounts([[10, 3, 20, null], [5, null, null, null]])).toEqual([15, 3, null, null]);
  });
  it("counts a county when most of its residents are inside; anything less than all of them is cut", () => {
    const r = regionCounties([["27003", 1], ["27141", 0.258], ["27027", 0.5], ["27171", 0.999]]);
    expect(r.counted).toEqual(["27003", "27027", "27171"]);
    expect(r.cut).toEqual([["27141", 0.258], ["27027", 0.5], ["27171", 0.999]]);
  });
});

describe("share of a parent place", () => {
  it("uses the ACS proportion formula", () => {
    // Hennepin's people in poverty as a share of Minnesota's (made-up round numbers).
    const s = shareOf(140000, 4000, 500000, 6000)!;
    expect(s.share).toBeCloseTo(28, 10);
    // √(4000² − 0.28²·6000²) / 500000 × 100
    expect(s.moe).toBeCloseTo((Math.sqrt(4000 ** 2 - 0.28 ** 2 * 6000 ** 2) / 500000) * 100, 10);
  });
  it("falls back to the ratio formula when the root would be negative", () => {
    const s = shareOf(900, 10, 1000, 100)!;
    expect(s.moe).toBeCloseTo((Math.sqrt(10 ** 2 + 0.9 ** 2 * 100 ** 2) / 1000) * 100, 10);
  });
  it("has no margin for full counts and nothing for an empty parent", () => {
    expect(shareOf(50, null, 200, 0)).toEqual({ share: 25, moe: null });
    expect(shareOf(5, 1, 0, 0)).toBeNull();
    expect(shareOf(null, 1, 10, 1)).toBeNull();
    expect(shareOf(5, 1, null, 1)).toBeNull();
  });
  it("climbs tract → county, state; county → state, U.S.; state → U.S.", () => {
    expect(parentsOf("27053100200")).toEqual(["27053", "27"]);
    expect(parentsOf("27053")).toEqual(["27", "us"]);
    expect(parentsOf("27")).toEqual(["us"]);
    expect(parentsOf("72127")).toEqual(["72"]);
    expect(parentsOf("72")).toEqual([]);
  });
});

describe("parts of a whole", () => {
  it("adds the remainder so the parts make 100%", () => {
    const p = partsOf([60, 25, 10])!;
    expect(p.parts).toEqual([60, 25, 10]);
    expect(p.rest).toBeCloseTo(5, 10);
  });
  it("never shows a negative remainder from rounding, and needs every member", () => {
    expect(partsOf([50.02, 50])!.rest).toBe(0);
    expect(partsOf([50, null])).toBeNull();
  });
  it("reads the sets and labels from relations.json", () => {
    expect(PARTS.map((p) => p.label)).toEqual(["Race and ethnicity", "How people get to work"]);
    expect(PARTS.every((p) => p.remainder)).toBe(true);
    expect(countsLabels("pct_poverty")?.of).toBeTruthy();
    expect(countsLabels("median_household_income")).toBeNull();
  });
});
