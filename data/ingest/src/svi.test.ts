import { describe, expect, it } from "vitest";
import { parseSvi, sviValue } from "./svi.ts";

// Rows shaped like CDC's SVI 2022 U.S. tract file (BOM, quoted LOCATION with commas).
const csv = "﻿ST,FIPS,LOCATION,RPL_THEME1,RPL_THEMES\r\n" +
  '27,27053026101,"Census Tract 261.01; Hennepin County; Minnesota",0.0067,0.0511\r\n' +
  '06,6037207400,"Census Tract 2074, Los Angeles County, California",0.9038,0.7664\r\n' +
  '01,01001990000,"Census Tract 9900; Autauga County; Alabama",-999,-999.0\r\n';

describe("sviValue", () => {
  it("turns CDC's 0–1 rank into a 0–100 percentile", () => {
    expect(sviValue("0.881")).toBe(88.1);
    expect(sviValue("0.0511")).toBe(5.11);
    expect(sviValue("1")).toBe(100);
    expect(sviValue("0")).toBe(0);
  });
  it("makes -999 and blanks no data, never a value", () => {
    expect(sviValue("-999")).toBeNull();
    expect(sviValue("-999.0")).toBeNull();
    expect(sviValue("")).toBeNull();
    expect(sviValue(undefined)).toBeNull();
  });
});

describe("parseSvi", () => {
  it("keys rows by padded FIPS and reads fields by name", () => {
    const rows = parseSvi(csv, ["RPL_THEMES", "RPL_THEME1"], 11);
    expect(rows.get("27053026101")).toEqual({ RPL_THEMES: "0.0511", RPL_THEME1: "0.0067" });
    expect(rows.get("06037207400")?.RPL_THEMES).toBe("0.7664");
    expect(sviValue(rows.get("01001990000")?.RPL_THEMES)).toBeNull();
  });
  it("fails loudly on a missing field", () => {
    expect(() => parseSvi(csv, ["RPL_THEME4"], 11)).toThrow(/RPL_THEME4/);
  });
});
