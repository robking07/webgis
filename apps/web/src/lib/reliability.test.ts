import { describe, expect, it } from "vitest";
import { moeRangeLine, noDataReason, reliabilityNote, unreliableIn, unreliableTracts } from "./reliability";

describe("unreliableTracts", () => {
  const shard = {
    pct_poverty: {
      "100200": [10, 2] as [number, number], // CV 12%: reliable
      "100300": [10, 4] as [number, number], // CV 24%: caution
      "100400": [5, 4] as [number, number], // CV 49%: unreliable
      "100500": [0, 3] as [number, number], // zero, small margin: not graded
      "100700": [0, 20] as [number, number], // zero, big margin: unreliable (hatched)
      "100600": [8, null] as [number, null], // no margin: not graded
    },
  };
  it("returns full geoids of unreliable tracts only", () => {
    expect(unreliableTracts(shard, "pct_poverty", "27053")).toEqual(["27053100400", "27053100700"]);
  });
  it("is empty for a missing shard or dataset", () => {
    expect(unreliableTracts(null, "pct_poverty", "27053")).toEqual([]);
    expect(unreliableTracts(shard, "median_age", "27053")).toEqual([]);
  });
});

describe("unreliableIn", () => {
  it("joins values and margins by geoid", () => {
    expect(unreliableIn({ a: 100, b: 100, c: 100 }, { a: 10, b: 60 })).toEqual(["b"]);
  });
});

describe("reliabilityNote", () => {
  it("has a note for caution and unreliable only", () => {
    expect(reliabilityNote(10, 2)).toBeNull();
    expect(reliabilityNote(null, 2)).toBeNull();
    expect(reliabilityNote(10, 4)?.title).toBe("Use with caution");
    expect(reliabilityNote(5, 4)?.title).toBe("Unreliable estimate");
  });
  it("says why a zero with a big margin is unreliable; a zero with a small one gets nothing", () => {
    expect(reliabilityNote(0, 57.69)?.body).toMatch(/estimate of zero/);
    expect(reliabilityNote(0, 0.4)).toBeNull();
  });
});

describe("noDataReason", () => {
  const acs = { measure: { kind: "acs5" } };
  const nri = { measure: { kind: "fema_nri" }, coverageNote: "Puerto Rico and the island territories show no data." };
  const nbi = { measure: { kind: "nbi" }, coverageNote: "Counties with fewer than 10 bridges show no data." };
  it("names Puerto Rico only when the source's coverage note does", () => {
    expect(noDataReason(nri, "72001")).toBe("This source has no data for Puerto Rico.");
    expect(noDataReason(nbi, "72001")).toBe("The source has no value for this area.");
    expect(noDataReason(acs, "72")).toBe("The Census Bureau doesn't publish this figure for this area.");
  });
  it("explains Connecticut's planning regions for non-Census sources", () => {
    expect(noDataReason(nbi, "09110")).toBe("This source still uses Connecticut's old counties (before 2022).");
    expect(noDataReason(acs, "09110")).toBe("The Census Bureau doesn't publish this figure for this area.");
    expect(noDataReason(nbi, "09")).toBe("The source has no value for this area.");
  });
  it("says Census doesn't publish it for a survey gap (Loving County mean commute)", () => {
    expect(noDataReason(acs, "48301")).toBe("The Census Bureau doesn't publish this figure for this area.");
  });
});

describe("moeRangeLine", () => {
  it("gives estimate ± margin for a wide margin, floored at 0", () => {
    expect(moeRangeLine(5, 4, "count")).toBe("Few households were surveyed here, so this is a range: likely between 1 and 9.");
    expect(moeRangeLine(5, 8, "count")).toContain("between 0 and 13");
  });
  it("caps percent shares at 100", () => {
    expect(moeRangeLine(90, 60, "percent")).toContain("and 100%");
  });
  it("says nothing for ordinary margins or missing data", () => {
    expect(moeRangeLine(10, 2, "percent")).toBeNull();
    expect(moeRangeLine(10, 4, "percent")).toBeNull(); // caution, not wide
    expect(moeRangeLine(null, 4, "percent")).toBeNull();
  });
});
