import { describe, expect, it } from "vitest";
import { searchDatasets } from "./registry";

const titles = (q: string) => searchDatasets(q, null).map((d) => d.title);

describe("dataset search (issue #252)", () => {
  it("doesn't match letters inside words of the descriptions", () => {
    // "Du" (for Duluth) used to list every CDC measure: their descriptions say "adults".
    expect(titles("Du")).toEqual([]);
    expect(titles("du")).toEqual([]);
  });
  it("finds the right maps first", () => {
    expect(titles("poverty").slice(0, 2)).toEqual(["Children in poverty", "Population below poverty"]);
    expect(titles("commute")[0]).toBe("90-minute-plus commutes");
    expect(titles("commute")).toContain("Commute by public transit");
    expect(titles("rent")[0]).toBe("Median rent");
    expect(titles("rent")).not.toContain("Cigarette smoking"); // "current smokers"
    expect(titles("bike")[0]).toBe("Bike to work");
    expect(titles("asthma")[0]).toBe("Asthma");
  });
  it("matches a word as it's being typed", () => {
    expect(titles("pov")).toContain("Population below poverty");
    expect(titles("asth")[0]).toBe("Asthma");
    expect(titles("Median RENT")[0]).toBe("Median rent");
  });
});
