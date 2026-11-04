import { describe, expect, it } from "vitest";
import { hpiChange, parseHpi } from "./fhfa.ts";

describe("FHFA HPI", () => {
  // Shape of the real county sheet: a title block, the header, then rows (short when there's no index).
  const rows = [
    ["HPI for Counties (All-Transactions Index)"], [""], ["* developmental"], ["Last updated: March 31, 2026."],
    ["State", "County", "FIPS code", "Year", "Annual Change (%)", "HPI", "HPI with 1990 base", "HPI with 2000 base"],
    ["MN", "Hennepin", "27053", "2015", "5", "606.86", "", ""],
    ["MN", "Hennepin", "27053", "2025", "2", "1002.1", "", ""],
    ["AL", "Conecuh", "01035", "2015", "1", "300", "", ""],
    ["AL", "Conecuh", "01035", "2025"], // too few sales: no index
    ["CT", "Capitol", "09110", "2015", "", "200", "", ""],
    ["CT", "Capitol", "09110", "2025", "", "150", "", ""], // a fall
    ["Source: FHFA"],
  ];

  it("reads FIPS, year and the HPI column, skipping rows without an index", () => {
    const h = parseHpi(rows);
    expect([...h.keys()].sort()).toEqual(["01035", "09110", "27053"]);
    expect(h.get("27053")!.get(2025)).toBe(1002.1);
    expect(h.get("01035")!.has(2025)).toBe(false);
  });

  it("gives the % change over 10 years; a missing year is no data, a fall is negative", () => {
    const c = hpiChange(parseHpi(rows), 2025);
    expect(c.get("27053")!.value).toBeCloseTo(65.14, 1); // Hennepin, 2015 to 2025
    expect(c.get("09110")!.value).toBeCloseTo(-25, 5);
    expect(c.has("01035")).toBe(false);
    expect(hpiChange(parseHpi(rows), 2024).size).toBe(0);
  });

  it("fails loudly on an unexpected header", () => {
    expect(() => parseHpi([["State", "Year", "Index"]])).toThrow(/header/);
  });
});
