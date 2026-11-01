import { describe, expect, it } from "vitest";
import { DATASETS, libraryIn, searchDatasets } from "./registry";

const titles = (q: string) => searchDatasets(q, null).map((d) => d.title);

describe("dataset search (issue #252)", () => {
  it("doesn't match letters inside words of the descriptions", () => {
    // "Du" (for Duluth) used to list every CDC measure: their descriptions say "adults".
    // A word starting "du" is a real match: duplexes (#372), the "active duty" tag (#373).
    expect(titles("Du")).toEqual(["Homes in duplexes", "People in the armed forces"]);
    expect(titles("du")).toEqual(["Homes in duplexes", "People in the armed forces"]);
  });
  it("finds the right maps first", () => {
    expect(titles("poverty").slice(0, 2)).toEqual(["Children in poverty", "Population below poverty"]);
    expect(titles("commute")).toContain("Commute 90 minutes or more");
    expect(titles("90-minute-plus")).toContain("Commute 90 minutes or more"); // old title still finds it
    expect(titles("commute")).toContain("Take transit to work");
    expect(titles("rent")[0]).toBe("Median rent");
    expect(titles("rent")).not.toContain("Cigarette smoking"); // "current smokers"
    expect(titles("bike")[0]).toBe("Bike to work");
    expect(titles("asthma")[0]).toBe("Asthma");
  });
  it("finds Library maps (#372), after Featured ones, and keeps them out of the menus", () => {
    expect(titles("renters over 65")[0]).toBe("Renters 65 and older");
    expect(titles("rent")[0]).toBe("Median rent"); // Featured still first
    expect(DATASETS.some((d) => d.library)).toBe(false);
    expect(libraryIn("Housing", "Homes").length).toBeGreaterThan(0);
  });
  it("matches a word as it's being typed", () => {
    expect(titles("pov")).toContain("Population below poverty");
    expect(titles("asth")[0]).toBe("Asthma");
    expect(titles("Median RENT")[0]).toBe("Median rent");
  });
});
