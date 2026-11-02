import { describe, expect, it } from "vitest";
import { decodeRk } from "./xls.ts";
import { timelineStops } from "@webgis/registry/timeline";
import type { DatasetEntry } from "@webgis/registry";
import { parseCountyDesignValues, parseSharedStrings, parseSheetRows } from "./airquality.ts";

describe("xlsx reading", () => {
  it("resolves shared strings, inline strings, numbers and skipped cells", () => {
    const strings = parseSharedStrings("<sst><si><t>Alabama</t></si><si><r><t>A &amp; </t></r><r><t>B</t></r></si></sst>");
    expect(strings).toEqual(["Alabama", "A & B"]);
    const rows = parseSheetRows('<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1"><v>6.2E-2</v></c><c r="D1" t="inlineStr"><is><t>x</t></is></c></row></sheetData>', strings);
    expect(rows).toEqual([["Alabama", "", "6.2E-2", "x"]]);
  });
});

describe("parseCountyDesignValues", () => {
  const hdr = ["State Name", "County Name", "State FIPS", "County FIPS", "EPA Region", "AQS Site ID", "2023-2025 Annual   Design Value (µg/m3) [1,2]", "CBSA Name"];
  it("finds the header, pads FIPS, rounds float noise, skips footnotes and missing values", () => {
    const r = parseCountyDesignValues([
      ["Table 4a. County-level Design Values"], [" "], hdr,
      ["Minnesota", "Hennepin", "27", "053", "5", "270530963", "9", "Minneapolis"],
      ["Alabama", "Elmore", "01", "051", "4", "010510004", "5.6000000000000001E-2", ""],
      ["Alabama", "Clay", "01", "027", "4", "x", "", ""],
      ["California", "Kern", "6", "29", "9", "x", "13.7", ""],
      ["[1] footnote text"],
    ], "2023-2025");
    expect(r.values.get("27053")).toBe(9);
    expect(r.values.get("01051")).toBe(0.056);
    expect(r.values.get("06029")).toBe(13.7);
    expect(r.values.has("01027")).toBe(false);
    expect(r.values.size).toBe(3);
    expect(r.skipped).toBe(1);
  });
  it("fails loudly when the period column is missing", () => {
    expect(() => parseCountyDesignValues([hdr], "2024-2026")).toThrow(/2024-2026/);
  });
});

describe("older workbooks", () => {
  it("keeps a county's highest valid monitor from a site listing, honoring the status column", () => {
    const rows = [
      ["epa_region", "site", "st", "cou", "dva_19992001", "dvstatusas_19992001"],
      ["5", "a", "17", "031", "15.5", "1"],
      ["5", "b", "17", "031", "17.4", "3"], // incomplete: ignored
      ["5", "c", "17", "031", "16.1", "2"],
    ];
    expect(parseCountyDesignValues(rows, "1999-2001").values.get("17031")).toBe(16.1);
  });
  it("reads ozone monitor listings (dv2003_2005, blank when invalid)", () => {
    const rows = [["stfips", "cntyfips", "dv2003_2005"], ["01", "003", "0.077"], ["01", "027", ""]];
    expect([...parseCountyDesignValues(rows, "2003-2005").values]).toEqual([["01003", 0.077]]);
  });
  it("decodes packed .xls numbers", () => {
    expect(decodeRk((7 << 2) | 2)).toBe(7); // integer
    expect(decodeRk((705 << 2) | 3)).toBe(7.05); // integer / 100
  });
  it("names each stop for its three-year window; the registry period is the headline", () => {
    const e = { measure: { kind: "airquality", period: "2023-2025" }, timeline: { from: 2023, to: 2025, step: 1 } } as DatasetEntry;
    expect(timelineStops(e).map((s) => [s.id, s.label, s.isDefault, s.boundaries])).toEqual([
      ["2023", "2021–2023", false, undefined], ["2024", "2022–2024", false, undefined], ["2025", "2023–2025", true, undefined]]);
  });
});
