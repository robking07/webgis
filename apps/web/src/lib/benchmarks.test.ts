import { describe, expect, it } from "vitest";
import { benchmarkRows, US_KINDS } from "./benchmarks";

const mn = { name: "Minnesota", value: 9.6 };

describe("benchmark rows", () => {
  it("shows the state and the U.S. for a county or tract", () => {
    expect(benchmarkRows("percent", "27053", mn, 12.4)).toEqual([{ label: "Minnesota", value: 9.6 }, { label: "U.S.", value: 12.4 }]);
    expect(benchmarkRows("percent", "27053026200", mn, 12.4)).toHaveLength(2);
  });
  it("skips what has no value, and the state for a state itself", () => {
    expect(benchmarkRows("percent", "27053", { name: "Minnesota", value: null }, 12.4)).toEqual([{ label: "U.S.", value: 12.4 }]);
    expect(benchmarkRows("percent", "27053", mn, null)).toEqual([{ label: "Minnesota", value: 9.6 }]);
    expect(benchmarkRows("percent", "27", mn, 12.4)).toEqual([{ label: "U.S.", value: 12.4 }]);
    expect(benchmarkRows("percent", "27053", null, null)).toEqual([]);
  });
  it("gives Puerto Rico no U.S. value (the Census U.S. totals leave it out)", () => {
    expect(benchmarkRows("percent", "72127", { name: "Puerto Rico", value: 40 }, 12.4)).toEqual([{ label: "Puerto Rico", value: 40 }]);
  });
  it("asks for a U.S. file only where one is published (ACS until #234 step 1)", () => {
    expect([...US_KINDS]).toEqual(["acs5"]);
  });
  it("shows nothing for totals, categories and percentiles", () => {
    for (const u of ["count", "agreements", "categories", "percentile"] as const) expect(benchmarkRows(u, "27053", mn, 12.4)).toEqual([]);
  });
});
