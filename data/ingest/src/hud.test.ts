import { describe, expect, it } from "vitest";
import { hudValue, parseHud, shareOfRenters } from "./hud.ts";

// ogr2ogr's CSV of program-1 rows, shaped like HUD's 2025 tract workbook.
const csv = 'code,total_occupied,hh_income,pct_lt30_median\n' +
  '"27053103400",712,15890,88\n' +
  '"01001020100",-4,-4,-4\n' +
  '"01001020801",-1,-1,-1\n' +
  '"27XXX999999",343,20000,80\n';

describe("hudValue", () => {
  it("keeps real numbers, including a true zero", () => {
    expect(hudValue("712")).toBe(712);
    expect(hudValue("0")).toBe(0);
  });
  it("makes HUD's missing, suppressed and non-reporting codes no data", () => {
    for (const raw of ["-1", "-4", "-5", "NA", "", undefined]) expect(hudValue(raw)).toBeNull();
  });
});

describe("parseHud", () => {
  it("keys rows by FIPS and skips HUD's Missing rows", () => {
    const rows = parseHud(csv, ["total_occupied", "pct_lt30_median"], "tract");
    expect([...rows.keys()]).toEqual(["27053103400", "01001020100", "01001020801"]);
    expect(rows.get("27053103400")).toEqual({ total_occupied: "712", pct_lt30_median: "88" });
  });
  it("fails loudly when a field is missing", () => {
    expect(() => parseHud(csv, ["people_total"], "tract")).toThrow(/lacks/);
  });
});

describe("shareOfRenters", () => {
  it("divides assisted households by renter households", () => {
    expect(shareOfRenters(24582, 201230)).toBeCloseTo(12.216, 2);
  });
  it("gives no value without both numbers or with no renters", () => {
    expect(shareOfRenters(null, 100)).toBeNull();
    expect(shareOfRenters(5, undefined)).toBeNull();
    expect(shareOfRenters(5, 0)).toBeNull();
  });
});
