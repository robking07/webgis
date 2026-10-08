import { describe, expect, it } from "vitest";
import { nriFields, nriValue } from "./nri.ts";

// Rows shaped like FEMA's NRI layers (Hennepin County values, v1.20.0).
const hennepin = { STCOFIPS: "27053", POPULATION: 1281172, EAL_VALT: 456_437_000, RISK_SCORE: 98.31, HRCN_EALT: null, HRCN_EALR: "Not Applicable", HWAV_EALT: 39_281_000, HWAV_EALR: "Relatively High" };

describe("nriValue", () => {
  it("returns the field as is", () => {
    expect(nriValue(hennepin, { field: "RISK_SCORE", perCapita: false })).toBe(98.31);
  });
  it("divides by population for per-resident measures", () => {
    expect(nriValue(hennepin, { field: "EAL_VALT", perCapita: true })).toBeCloseTo(356.27, 1);
  });
  it("reads a blank rated Not Applicable as zero, and other blanks as no data", () => {
    expect(nriValue(hennepin, { field: "HRCN_EALT", perCapita: true, ratingField: "HRCN_EALR" })).toBe(0);
    expect(nriValue(hennepin, { field: "HRCN_EALT", perCapita: true })).toBeNull();
    const alaska = { POPULATION: 290985, HWAV_EALT: null, HWAV_EALR: "Insufficient Data" };
    expect(nriValue(alaska, { field: "HWAV_EALT", perCapita: true, ratingField: "HWAV_EALR" })).toBeNull();
  });
  it("gives no per-resident value below the population floor or with no population", () => {
    const port = { POPULATION: 4, EAL_VALT: 7_590_000 };
    expect(nriValue(port, { field: "EAL_VALT", perCapita: true }, 100)).toBeNull();
    expect(nriValue(port, { field: "EAL_VALT", perCapita: true })).toBe(1_897_500);
    expect(nriValue({ POPULATION: 0, EAL_VALT: 5 }, { field: "EAL_VALT", perCapita: true })).toBeNull();
    expect(nriValue({ POPULATION: 4, RISK_SCORE: 12 }, { field: "RISK_SCORE", perCapita: false }, 100)).toBe(12);
  });
  it("treats a missing score as no data, not zero", () => {
    expect(nriValue({ RISK_SCORE: null, RISK_RATNG: "Insufficient Data" }, { field: "RISK_SCORE", perCapita: false })).toBeNull();
  });
});

describe("nriFields", () => {
  it("lists the population and rating fields a measure needs", () => {
    expect(nriFields({ field: "WFIR_EALT", perCapita: true, ratingField: "WFIR_EALR" })).toEqual(["WFIR_EALT", "POPULATION", "WFIR_EALR"]);
    expect(nriFields({ field: "SOVI_SCORE", perCapita: false })).toEqual(["SOVI_SCORE"]);
  });
});
