import { describe, expect, it } from "vitest";
import { bothHave, canCompare, compareGeoid, compareHref, compareValues, gapIsClear, gapText, parseCompare, rowVerdictText, searchAtLevel, shortName, verdictText } from "./compare";
import type { PlaceRow } from "./search";

describe("compare route", () => {
  it("round-trips two places and the metric", () => {
    for (const s of [{ a: "27053", b: "27123", d: "pct_poverty" }, { a: "27", b: "55", d: "median_household_income" }, { a: "27053026100", b: "27053100200", d: "gini_index" }]) {
      const href = compareHref(s);
      const [, , a, rest] = href.split("/");
      const [b, q] = rest.split("?");
      expect(parseCompare(a, b, q)).toEqual(s);
    }
    expect(compareHref({ a: "27053", b: "27123", d: "pct_poverty" })).toBe("/compare/27053/27123?d=pct_poverty");
  });
  it("keeps a comparison with no metric, and drops a malformed one", () => {
    expect(compareHref({ a: "27", b: "55", d: null })).toBe("/compare/27/55");
    expect(parseCompare("27", "55", "")).toEqual({ a: "27", b: "55", d: null });
    expect(parseCompare("27", "55", "d=<script>")).toEqual({ a: "27", b: "55", d: null });
  });
  it("refuses mixed levels, the same place twice, block groups and junk", () => {
    expect(parseCompare("27", "27053", "")).toBeNull();
    expect(parseCompare("27053", "27053", "")).toBeNull();
    expect(parseCompare("270530261001", "270530261002", "")).toBeNull();
    expect(parseCompare("abc", "27053", "")).toBeNull();
    expect(parseCompare("270", "271", "")).toBeNull();
  });
  it("compares block groups and blocks as their tract (tract is the finest level)", () => {
    expect(compareGeoid("270530261001", "block_group")).toBe("27053026100");
    expect(compareGeoid("270530261001002", "block")).toBe("27053026100");
    expect(compareGeoid("27053026100", "tract")).toBe("27053026100");
    expect(compareGeoid("27053", "county")).toBe("27053");
  });
  it("shortens names to the first part", () => {
    expect(shortName("Hennepin County, MN")).toBe("Hennepin County");
    expect(shortName("Census tract 261, Hennepin County, MN")).toBe("Census tract 261");
    expect(shortName("Minnesota")).toBe("Minnesota");
  });
});

describe("the difference test (ACS, 90%)", () => {
  // Clear when |A − B| > √(moeA² + moeB²): z = |A − B| / (√(moeA² + moeB²) / 1.645) > 1.645.
  it("calls a gap clear only when it is larger than the combined margin", () => {
    expect(gapIsClear({ value: 12, moe: 0.5 }, { value: 10, moe: 0.5 })).toBe(true); // 2 > 0.71
    expect(gapIsClear({ value: 12, moe: 3 }, { value: 10, moe: 4 })).toBe(false); // 2 < 5
    expect(gapIsClear({ value: 15, moe: 3 }, { value: 10, moe: 4 })).toBe(false); // 5 = 5, not more
    expect(gapIsClear({ value: 15.1, moe: 3 }, { value: 10, moe: 4 })).toBe(true);
    expect(gapIsClear({ value: 15, moe: 0 }, { value: 10, moe: 0 })).toBe(true);
  });
  it("can't test without both margins", () => {
    expect(gapIsClear({ value: 12, moe: null }, { value: 10, moe: 1 })).toBeNull();
    expect(gapIsClear({ value: null, moe: 1 }, { value: 10, moe: 1 })).toBeNull();
  });
  it("survey maps: about the same, clear, or untested when a margin is missing", () => {
    expect(compareValues("acs5", { value: 12, moe: 3 }, { value: 10, moe: 4 })).toEqual({ kind: "about_same" });
    expect(compareValues("acs5", { value: 9.1, moe: 0.4 }, { value: 12.2, moe: 0.5 })).toEqual({ kind: "higher", higher: "b", gap: expect.closeTo(3.1, 5), tested: true });
    expect(compareValues("acs5", { value: 12, moe: null }, { value: 10, moe: 4 })).toEqual({ kind: "higher", higher: "a", gap: 2, tested: false });
  });
  it("non-survey maps get the plain difference, never a verdict", () => {
    // CDC PLACES' ± is a 95% interval; climate, FARS and counts have none.
    for (const kind of ["places", "climdiv", "fars", "census2020"]) {
      expect(compareValues(kind, { value: 12, moe: 3 }, { value: 10, moe: 4 })).toEqual({ kind: "higher", higher: "a", gap: 2, tested: false });
    }
  });
  it("handles equal and missing values", () => {
    expect(compareValues("acs5", { value: 10, moe: 1 }, { value: 10, moe: 1 })).toEqual({ kind: "same" });
    expect(compareValues("places", { value: 10, moe: null }, { value: null, moe: null })).toEqual({ kind: "missing" });
  });
});

describe("plain words", () => {
  const names = { a: "Hennepin County", b: "Ramsey County" };
  it("phrases the headline", () => {
    expect(verdictText({ kind: "higher", higher: "a", gap: 3.14, tested: true }, "percent", names)).toBe("Hennepin County is 3.1 points higher");
    expect(verdictText({ kind: "higher", higher: "b", gap: 4210, tested: true }, "dollars", names)).toBe("Ramsey County is $4,210 higher");
    expect(verdictText({ kind: "about_same" }, "percent", names)).toBe("About the same");
    expect(verdictText({ kind: "missing" }, "percent", names)).toBe("Not available for both places");
  });
  it("phrases gaps per unit", () => {
    expect(gapText(1, "percent")).toBe("1 point");
    expect(gapText(12, "percentile")).toBe("12 points");
    expect(gapText(2.5, "minutes")).toBe("2.5 min");
  });
  it("phrases a row", () => {
    expect(rowVerdictText({ kind: "higher", higher: "b", gap: 1, tested: false }, names)).toBe("Ramsey County higher");
    expect(rowVerdictText({ kind: "about_same" }, names)).toBe("About the same");
    expect(rowVerdictText({ kind: "missing" }, names)).toBe("");
  });
});

describe("picking place B", () => {
  const rows: PlaceRow[] = [
    ["Minnesota", "State", "27", -94, 46, 79600], ["Wisconsin", "State", "55", -89, 44, 54000],
    ["Hennepin County, MN", "County", "27053", -93.5, 45, 554], ["Ramsey County, MN", "County", "27123", -93.1, 45, 152],
    ["Ramsey, MN", "City", "", -93.4, 45.2, 29], ["Ramsey Borough, PA", "Borough", "", -80, 40, 2],
    ["Hennepin, IL", "Village", "", -89.3, 41.2, 1],
  ];
  it("searches only counties for a county, without place A or cities", () => {
    expect(searchAtLevel(rows, "ram", "county", "27053").map((h) => h.geoid)).toEqual(["27123"]);
    expect(searchAtLevel(rows, "henn", "county", "27053")).toEqual([]);
    expect(searchAtLevel(rows, "henn", "county", "27123").map((h) => h.name)).toEqual(["Hennepin County, MN"]);
  });
  it("searches only states for a state", () => {
    expect(searchAtLevel(rows, "in", "state", "27").map((h) => h.geoid)).toEqual(["55"]);
  });
  it("has no search for tracts (they're picked on the map)", () => {
    expect(searchAtLevel(rows, "ram", "tract", "27053026100")).toEqual([]);
  });
});

describe("only what works for compare (Robbie, 2026-10-09)", () => {
  const acs = { measure: { kind: "acs5" }, geographyLevels: ["state", "county", "tract", "block_group"] };
  const places = { measure: { kind: "places" }, geographyLevels: ["county"] };
  const roads = { measure: { kind: "features" }, geographyLevels: [] };
  const blocksOnly = { measure: { kind: "census2020" }, geographyLevels: ["block_group", "block"] };
  it("offers compare at state, county and tract where the map has values", () => {
    for (const l of ["state", "county", "tract"] as const) expect(canCompare(acs, l, { aValue: 3 })).toBe(true);
    expect(canCompare(places, "county", { aValue: 30 })).toBe(true);
    expect(canCompare(places, "state", { aValue: 30 })).toBe(false);
    expect(canCompare(places, "tract")).toBe(false);
  });
  it("block groups compare as their tract, only if the map has tracts", () => {
    expect(canCompare(acs, "block_group")).toBe(true);
    expect(canCompare(blocksOnly, "block_group")).toBe(false);
    expect(canCompare(blocksOnly, "block")).toBe(false);
  });
  it("never for feature layers, another period, or a place with no value", () => {
    expect(canCompare(roads, "county")).toBe(false);
    expect(canCompare(acs, "county", { otherPeriod: true, aValue: 3 })).toBe(false);
    expect(canCompare(acs, "county", { aValue: null })).toBe(false);
  });
  it("lists a row only when both places have a value", () => {
    expect(bothHave({ value: 1, moe: null }, { value: 0, moe: null })).toBe(true);
    expect(bothHave({ value: 1, moe: null }, { value: null, moe: null })).toBe(false);
    expect(bothHave(undefined, { value: 2, moe: null })).toBe(false);
  });
});
