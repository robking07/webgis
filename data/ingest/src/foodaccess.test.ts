import { describe, expect, it } from "vitest";
import { foodAccessSums } from "./foodaccess.ts";

const CSV = [
  "CensusTract,State,County,Urban,Pop2010,OHU2010,LILATracts_1And10,LAPOP1_10,lapop1,lapop10,lahunvhalf",
  "1001020100,Alabama,Autauga County,1,1000,400,1,600,600,NULL,20",
  "1001020200,Alabama,Autauga County,0,3000,1000,0,NULL,2900,NULL,NULL",
  "46113940500,South Dakota,Shannon County,0,2000,500,1,NULL,1900,1500,50",
  "",
].join("\n");

describe("foodAccessSums", () => {
  it("sums a count column over a total by county and state, NULL counting as 0", () => {
    const s = foodAccessSums(CSV, { count: "LAPOP1_10", per: "Pop2010" });
    expect(s.county.get("01001")).toEqual([600, 4000]);
    expect(s.state.get("01")).toEqual([600, 4000]);
  });
  it("takes the rural count column in rural tracts", () => {
    const s = foodAccessSums(CSV, { count: "lapop1", ruralCount: "lapop10", per: "Pop2010" });
    expect(s.county.get("01001")).toEqual([600, 4000]); // the rural tract's 2,900 within 10 miles don't count
    expect(s.county.get("46102")).toEqual([1500, 2000]); // USDA's LAPOP1_10 is blank here
  });
  it("counts only flagged tracts when a flag column is given", () => {
    const s = foodAccessSums(CSV, { count: "Pop2010", flag: "LILATracts_1And10", per: "Pop2010" });
    expect(s.county.get("01001")).toEqual([1000, 4000]);
  });
  it("pads tract codes and renames 2010 counties that changed code", () => {
    const s = foodAccessSums(CSV, { count: "lahunvhalf", per: "OHU2010" });
    expect(s.county.get("46102")).toEqual([50, 500]); // Shannon → Oglala Lakota
    expect(s.county.has("46113")).toBe(false);
  });
  it("fails loudly on a missing column", () => {
    expect(() => foodAccessSums(CSV, { count: "LAPOP05_10", per: "Pop2010" })).toThrow(/missing/);
  });
});
