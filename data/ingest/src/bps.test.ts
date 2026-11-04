import { describe, expect, it } from "vitest";
import { bpsValues, parseBps } from "./bps.ts";

describe("building permits", () => {
  // Shape of the real county files: two header lines, a blank line, then rows (1990s files pad with spaces).
  const county = [
    "Survey,FIPS,FIPS,Region,Division,County,,1-unit,,,2-units,,,3-4 units,,,5+ units",
    "Date,State,County,Code,Code,Name,Bldgs,Units,Value,Bldgs,Units,Value,Bldgs,Units,Value,Bldgs,Units,Value,Bldgs,Units,Value",
    " ",
    "2024,27,053,2,4,Hennepin County ,2054,2054,1,36,72,1,15,54,1,18,1739,1,9,9,9",
    "9099 , 12 , 025 , 3 , 5 , Dade County , 10 , 10 , 1 , 0 , 0 , 0 , 0 , 0 , 0 , 1 , 30 , 1 , 9 , 9 , 9",
    "2024,35,000,4,8,New Mexico Balance of State,5,5,1,0,0,0,0,0,0,0,0,0,0,0,0",
    "2024,27,001,2,4,Aitkin County ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0",
  ].join("\n");

  it("adds 1, 2, 3–4 and 5+ unit buildings (the imputed estimates, not the reported-only columns)", () => {
    const p = parseBps(county);
    expect(p.get("27053")).toEqual([3919, 1739]); // Census's published 2024 total for Hennepin
    expect(p.get("12086")).toEqual([40, 30]); // Dade → Miami-Dade
  });

  it("reads state files by the same header, skipping region and U.S. rows", () => {
    const st = parseBps(["x", "Date,State,Code,Code,Name,Bldgs,Units,Value,Bldgs,Units,Value,Bldgs,Units,Value,Bldgs,Units,Value",
      "202499,27,2,4,Minnesota,100,100,1,2,4,1,0,0,0,3,60,1", "202499,US,0,0,United States,1,1,1,1,1,1,1,1,1,1,1,1"].join("\n"));
    expect([...st]).toEqual([["27", [164, 60]]]);
    expect(() => parseBps("x\nDate,State,Name,Units")).toThrow(/unexpected header/);
  });

  it("gives no value to places without residents on the map or with no units for a share", () => {
    const pop = new Map([["27053", 1_277_084], ["27001", 15_000]]);
    const rate = bpsValues(parseBps(county), "per_1k", pop, "t");
    expect(rate.get("27053")!.value).toBeCloseTo(3.069, 3);
    expect(rate.get("27001")!.value).toBe(0); // issues permits, permitted none: a real zero
    expect(rate.has("35000")).toBe(false); // state-wide permits: no county
    expect(rate.has("27003")).toBe(false); // not in the file: no data
    const share = bpsValues(parseBps(county), "multifamily", pop, "t");
    expect(share.get("27053")!.value).toBeCloseTo(44.37, 2);
    expect(share.get("27001")!.value).toBeNull();
  });
});
