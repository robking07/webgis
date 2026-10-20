import { describe, expect, it } from "vitest";
import { facilityFips, triTotals, triValues } from "./tri.ts";

const facilities = [
  "tri_facility_id,facility_name,state_county_fips_code,asgn_public_contact",
  'A,"ACME, INC",27053,SOMEONE',
  "B,PLANT,09001,SOMEONE",
  "C,CT NEW,09110,X",
  "D,NO CODE,,X",
].join("\n");
const basic = [
  "1. YEAR,2. TRIFD,50. UNIT OF MEASURE,65. ON-SITE RELEASE TOTAL",
  "2024,A,Pounds,100.5",
  "2024,A,Pounds,99.5",
  "2024,A,Grams,5",
  "2024,B,Pounds,90",
  "2024,C,Pounds,10",
  "2024,D,Pounds,7",
].join("\n");

describe("tri", () => {
  it("sums pounds by county and state, skipping grams", () => {
    const t = triTotals(basic, facilityFips(facilities));
    expect(t.county.get("27053")).toBe(200);
    expect(t.state.get("09")).toBe(100);
    expect(t.pounds).toBe(307);
    expect(t.noFips).toBe(7);
    expect(t.facilities).toBe(4);
  });
  it("divides by area, gives 0 where nothing is reported, and blanks a state's counties under old codes", () => {
    const t = triTotals(basic, facilityFips(facilities));
    const v = triValues(t.county, new Map([["27053", 100], ["27001", 50], ["09110", 10]]));
    expect(v.get("27053")!.value).toBe(2);
    expect(v.get("27001")!.value).toBe(0);
    expect(v.get("09110")!.value).toBeNull();
  });
});
