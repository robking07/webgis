import { describe, expect, it } from "vitest";
import { beaValues, parseBea } from "./bea.ts";

describe("BEA income", () => {
  // Shape of the real CAINC1 all-areas file: GeoFIPS is quoted with a leading space; line 3 is per capita.
  const head = "GeoFIPS,GeoName,Region,TableName,LineCode,IndustryClassification,Description,Unit,1990,2023,2024";
  const row = (g: string, line: number, a: string, b: string, c: string) => ` "${g}",Somewhere,4,CAINC1,${line},...,x,Dollars,${a},${b},${c}`;
  const text = [head,
    row("00000", 3, "19000", "70000", "73204"), // U.S.: skipped
    row("98000", 3, "1", "1", "1"), // BEA region: skipped
    row("27000", 3, "20000", "72000", "75603"),
    row("27053", 2, "1", "1", "1"), // population line: skipped
    row("27053", 3, "26136", "96394", "100352"),
    row("09001", 3, "30000", "140184", "(NA)"), // Connecticut old county, gone in 2024
    row("51919", 3, "30000", "109471", "114330"), // Fairfax + Fairfax City + Falls Church: each gets the figure
    row("02901", 3, "4000", "(NA)", "(NA)"), // old Alaska division: not in a known group, skipped
    row("48301", 3, "(D)", "210370", "220625"),
    "Note: See the included footnote file.",
  ].join("\n");

  it("keeps states and counties, spreading a combined area over its members, per-capita line only", () => {
    const b = parseBea(text);
    expect([...b.get(2024)!.keys()].sort()).toEqual(["09001", "27", "27053", "48301", "51059", "51600", "51610"]);
    expect(b.get(2024)!.get("51600")).toBe(114330);
    expect(b.get(2024)!.get("27053")).toBe(100352);
    expect(b.get(2024)!.get("09001")).toBeNull();
    expect(b.get(1990)!.get("48301")).toBeNull();
  });

  it("restates earlier years to 2024 dollars; the default year is as published; no data stays null", () => {
    const b = parseBea(text);
    expect(beaValues(b, 2024, "county").get("27053")!.value).toBe(100352);
    expect(Math.round(beaValues(b, 1990, "county").get("27053")!.value!)).toBe(Math.round(26136 * 313.689 / 130.7));
    expect(beaValues(b, 2024, "county").get("09001")!.value).toBeNull();
    expect([...beaValues(b, 2024, "state").keys()]).toEqual(["27"]);
    expect(() => beaValues(b, 1980, "county")).toThrow(/CPI-U/);
  });
});
