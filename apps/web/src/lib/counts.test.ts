import { describe, expect, it } from "vitest";
import { countsLabels, PARTS, parentsOf, partsOf, shareOf } from "./counts";

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
