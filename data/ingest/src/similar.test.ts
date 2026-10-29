import { describe, expect, it } from "vitest";
import { findSimilar, percentiles, pickMeasures } from "./similar.ts";
import type { DatasetEntry } from "@webgis/registry";

describe("percentiles", () => {
  it("ranks 0 to 1, ties share the middle rank, nulls stay NaN", () => {
    expect([...percentiles([30, 10, null, 20, 20])]).toEqual([1, 0, NaN, 0.5, 0.5]);
    expect([...percentiles([5])]).toEqual([0.5]);
  });
});

describe("findSimilar", () => {
  // Two cities, two farm counties and one in between, on income, density and age (income and density share a topic).
  const table = {
    "00001": [90, 5000, 35],
    "00002": [88, 4000, 36],
    "00003": [40, 10, 50],
    "00004": [42, 12, 49],
    "00005": [60, 300, null],
  };
  const out = findSimilar(table, ["income", "density", "age"], ["Economy", "Economy", "People"], 2);

  it("lists the closest counties first, never the county itself", () => {
    expect(out.counties["00001"].map((m) => m[0])).toEqual(["00002", "00005"]);
    expect(out.counties["00003"][0][0]).toBe("00004");
    expect(Object.values(out.counties).every((ms) => ms.length === 2)).toBe(true);
  });

  it("names what made them alike, high and low, one measure per topic", () => {
    const [, dist, high, low] = out.counties["00001"][0];
    expect(dist).toBeGreaterThan(0);
    // Income and density are both in their top quarters but share a topic, so only income (first) is named.
    expect(high.map((i) => out.measures[i])).toEqual(["income"]);
    expect(low).toEqual([]);
    // Farm counties: both low; age doesn't count (one is the oldest, the other only just above the middle).
    const [, , h3, l3] = out.counties["00003"][0];
    expect(h3).toEqual([]);
    expect(l3.map((i) => out.measures[i])).toEqual(["income"]);
  });

  it("compares a county missing a measure on the measures it has", () => {
    expect(out.counties["00005"]).toHaveLength(2);
  });
});

describe("pickMeasures", () => {
  it("keeps county measures with enough coverage and drops categories", () => {
    const e = (id: string, unit: string, levels = ["county"]) => ({ id, unit, geographyLevels: levels }) as unknown as DatasetEntry;
    const entries = [e("a", "percent"), e("b", "percent"), e("c", "categories"), e("d", "percent", ["tract"])];
    expect(pickMeasures(entries, { a: 100, b: 80, c: 100, d: 100 }, 100)).toEqual(["a"]);
  });
});
