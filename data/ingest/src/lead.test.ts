import { describe, expect, it } from "vitest";
import { addSums, leadValue, parseLeadHeader, parseLeadRow, rollUp, type Sums } from "./lead.ts";

// Real header orders from the 2022 files: county files lead with ABV/NAME, tract files put TEN last.
const COUNTY_HDR = "﻿ABV,STATE,FIP,NAME,AMI150,TEN,TEN-YBL6,TEN-BLD,TEN-HFL,UNITS,FREQUENCY,HINCP*UNITS,ELEP*UNITS,GASP*UNITS,FULP*UNITS,HINCP UNITS,ELEP UNITS,GASP UNITS,FULP UNITS,WHITE ALONE HISPANIC OR LATINO";
const TRACT_HDR = "STATE,FIP,AMI150,TEN-YBL6,TEN-BLD,TEN-HFL,UNITS,FREQUENCY,HINCP*UNITS,ELEP*UNITS,GASP*UNITS,FULP*UNITS,HINCP UNITS,ELEP UNITS,GASP UNITS,FULP UNITS,TEN";

describe("parsing LEAD CSVs", () => {
  it("finds columns by name in both county and tract layouts", () => {
    const c = parseLeadHeader(COUNTY_HDR, "AMI150"), t = parseLeadHeader(TRACT_HDR, "AMI150");
    expect([c.fip, c.band, c.cols[0]]).toEqual([2, 4, 9]);
    expect([t.fip, t.band, t.cols[0]]).toEqual([1, 2, 6]);
  });
  it("reads the poverty-level band from the FPL files", () => {
    const h = parseLeadHeader(TRACT_HDR.replace("AMI150", "FPL150"), "FPL150");
    const r = parseLeadRow("27,27053000101,150-200%,RENTER 1980-99,RENTER 50+ UNIT,RENTER ELECTRICITY,12,3,480000,9000,0,0,12,10,0,0,REN", h, 11);
    expect(r?.[1]).toBe("150-200%");
    expect(leadValue(r![2], "burden")).toBeCloseTo((100 * 900) / 40_000, 6);
  });
  it("fails loudly when a column is missing", () => {
    expect(() => parseLeadHeader(TRACT_HDR, "FPL150")).toThrow(/FPL150/);
    expect(() => parseLeadHeader("FIP,AMI150,UNITS", "AMI150")).toThrow(/HINCP\*UNITS/);
  });
  it("pads geoids, reads the band, treats blanks as zero and skips empty lines", () => {
    const t = parseLeadHeader(TRACT_HDR, "AMI150");
    const r = parseLeadRow("1,1001020100,0-30%,OWNER 1940-59,OWNER 1 ATTACHED,OWNER FUEL OIL,18.1,0.98,601358.5,,9.0e-09,8.9e-09,18.1,0,18.1,18.1,OWN", t, 11);
    expect(r?.[0]).toBe("01001020100");
    expect(r?.[1]).toBe("0-30%");
    expect(r?.[2]).toEqual([18.1, 601358.5, 0, 9.0e-09, 8.9e-09, 18.1, 0, 18.1, 18.1]);
    expect(parseLeadRow("   ", t, 11)).toBeNull();
    const c = parseLeadHeader(COUNTY_HDR, "AMI150");
    expect(parseLeadRow("AL,1,1001,Autauga County,150%+,REN,x,y,z,1,1,1,1,1,1,1,1,1,1,0", c, 5)?.[0]).toBe("01001");
  });
});

// [UNITS, HINCP*UNITS, ELEP*UNITS, GASP*UNITS, FULP*UNITS, HINCP UNITS, ELEP UNITS, GASP UNITS, FULP UNITS]
const a: Sums = [10, 400_000, 12_000, 6_000, 0, 10, 10, 5, 10]; // 10 homes, $40k avg income, $1,200 elec, $1,200 gas (5 homes), no other fuel
const b: Sums = [30, 3_000_000, 30_000, 0, 6_000, 30, 20, 0, 30]; // 30 homes, $100k, $1,500 elec (20 pay it), $200 other

describe("leadValue", () => {
  it("divides average cost by average income, each over its own household count (DOE's definition)", () => {
    expect(leadValue(a, "cost")).toBeCloseTo(1200 + 1200, 6);
    expect(leadValue(a, "burden")).toBeCloseTo((100 * 2400) / 40_000, 6); // 6%
  });
  it("is a ratio of summed cohorts, not an average of cohort ratios", () => {
    const s = new Map<string, Sums>();
    addSums(s, "x", a); addSums(s, "x", b);
    const t = s.get("x")!;
    // elec 42,000/30 = 1,400; gas 6,000/5 = 1,200; other 6,000/40 = 150; income 3.4M/40 = 85,000
    expect(leadValue(t, "cost")).toBeCloseTo(1400 + 1200 + 150, 6);
    expect(leadValue(t, "burden")).toBeCloseTo((100 * 2750) / 85_000, 6);
    expect(leadValue(t, "burden")).not.toBeCloseTo((leadValue(a, "burden")! + leadValue(b, "burden")!) / 2, 2);
  });
  it("gives no value for empty, too-small or zero-income groups", () => {
    expect(leadValue([0, 0, 0, 0, 0, 0, 0, 0, 0], "burden")).toBeNull();
    expect(leadValue(a, "burden", 20)).toBeNull();
    expect(leadValue(a, "burden", 10)).not.toBeNull();
    expect(leadValue([5, -1000, 500, 0, 0, 5, 5, 0, 0], "burden")).toBeNull();
    expect(leadValue([5, 0, 0, 0, 0, 5, 0, 0, 0], "cost")).toBeNull();
  });
});

describe("rollUp", () => {
  it("sums tracts into counties and states by geoid prefix", () => {
    const tracts = new Map<string, Sums>([["27053000100", a], ["27053000200", b], ["27123000100", a]]);
    const r = rollUp(tracts);
    expect(r.tract.size).toBe(3);
    expect(r.county.get("27053")![0]).toBe(40);
    expect(r.county.get("27123")![0]).toBe(10);
    expect(r.state.get("27")![1]).toBe(3_800_000);
    expect(a[0]).toBe(10); // inputs untouched
  });
});
