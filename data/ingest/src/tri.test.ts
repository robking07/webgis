import { describe, expect, it } from "vitest";
import { facilityFips, triTotals, triValues } from "./tri.ts";

const facilities = [
  "tri_facility_id,facility_name,state_county_fips_code,asgn_public_contact",
  'A,"ACME, INC",27053,SOMEONE',
  "B,PLANT,09001,SOMEONE",
  "D,NO CODE,,X",
  "E,MINE,00000,X",
].join("\n");
const basic = [
  "1. YEAR,2. TRIFD,7. COUNTY,8. ST,50. UNIT OF MEASURE,65. ON-SITE RELEASE TOTAL",
  "2024,A,HENNEPIN,MN,Pounds,100.5",
  "2024,A,HENNEPIN,MN,Pounds,99.5",
  "2024,A,HENNEPIN,MN,Grams,5",
  "2024,B,HARTFORD,CT,Pounds,90",
  "2024,D,NOWHERE,MN,Pounds,7",
  "2024,E,FAIRBANKS NORTH STAR BORO,AK,Pounds,50",
  "2024,F,GUAM,GU,Pounds,3",
].join("\n");
const counties = new Map([["27053", "Hennepin County, MN"], ["27001", "Aitkin County, MN"], ["02090", "Fairbanks North Star Borough, AK"], ["09110", "Capitol Planning Region, CT"]]);

describe("tri", () => {
  it("sums pounds by county and state, skipping grams and matching bad codes by county name", () => {
    const t = triTotals(basic, facilityFips(facilities), counties);
    expect(t.county.get("27053")).toBe(200);
    expect(t.county.get("02090")).toBe(50);
    expect(t.county.get("09001")).toBe(90); // old CT code, no name match: kept so triValues can blank CT
    expect(t.state.get("27")).toBe(207);
    expect(t.state.get("09")).toBe(90);
    expect(t.pounds).toBe(350);
    expect(t.noFips).toBe(10);
    expect(t.facilities).toBe(5);
  });
  it("divides by area, gives 0 where nothing is reported, and blanks a state's counties under old codes", () => {
    const t = triTotals(basic, facilityFips(facilities), counties);
    const v = triValues(t.county, new Map([["27053", 100], ["27001", 50], ["09110", 10]]));
    expect(v.get("27053")!.value).toBe(2);
    expect(v.get("27001")!.value).toBe(0);
    expect(v.get("09110")!.value).toBeNull();
  });
});
