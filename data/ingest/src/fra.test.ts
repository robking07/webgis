import { describe, expect, it } from "vitest";
import { countValues, tally } from "./fra.ts";

describe("FRA grade crossings", () => {
  // Shape of the grouped Socrata rows: Form 57 has a 2-digit state and 3-digit county; Form 71 a 5-digit county.
  const crashes = [
    { statecode: "27", countycode: "053", n: "4" },
    { statecode: "27", countycode: "001", n: "1" },
    { statecode: "27", n: "2" }, // no county: the state only
    { statecode: "12", countycode: "025", n: "3" }, // Dade → Miami-Dade
    { countycode: "009", n: "1" }, // no state: dropped
    { statecode: "09", countycode: "003", n: "5" }, // Connecticut's old county
  ];

  it("tallies by state and county, renaming retired codes", () => {
    const t = tally(crashes);
    expect(t.state.get("27")).toBe(7);
    expect(t.county.get("27053")).toBe(4);
    expect(t.county.get("12086")).toBe(3);
    expect(t.state.size).toBe(3);
    expect(tally([{ countycode: "48201", n: "663" }]).state.get("48")).toBe(663);
  });

  it("gives every place a value (0 where none), averaged over the years", () => {
    const v = countValues(tally(crashes), "county", ["27053", "27001", "27003", "12086", "72001"], 2, "t");
    expect(v.get("27053")!.value).toBe(2);
    expect(v.get("27003")!.value).toBe(0); // no crashes: a real zero
    expect(v.has("72001")).toBe(false); // FRA doesn't cover Puerto Rico
  });

  it("blanks a state's counties when over 5% of its count is under codes not on the map", () => {
    const v = countValues(tally(crashes), "county", ["27053", "27001", "09110", "09120"], 1, "t");
    expect(v.get("09110")!.value).toBeNull(); // Connecticut's planning regions vs its old counties
    expect(v.get("27053")!.value).toBe(4); // Minnesota's 2 county-less crashes aren't "lost"
  });
});
