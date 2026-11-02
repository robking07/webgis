import { describe, expect, it } from "vitest";
import { parse1990s, parseCsv, parseDecadeText } from "./popest.ts";

describe("Census population estimate parsers", () => {
  it("reads the 1970s/80s blocks, joins a wrapped county name, skips state rows", () => {
    const text = [
      "Code  Area Name            1975      1976",
      "00000 United States   215464000 217562000",
      "02000 Alaska             400000    410000",
      "02090 Fairbanks North",
      "       Star Bor.          45864     47300",
      "12025 Dade Co.          1493300   1500100",
    ].join("\n");
    const p = parseDecadeText(text);
    expect(p.get(1976)!.get("02090")).toBe(47300);
    expect(p.get(1975)!.get("12025")).toBe(1493300);
    expect(p.get(1975)!.has("02000")).toBe(false);
  });
  it("reads the 1990s block 1 by column and fills a garbled cell from its neighbours", () => {
    const cell = (v: string, w = 12) => v.padStart(w);
    const row = (code: string, v: string[]) => `1  ${code}${cell(v[0], 13)}${v.slice(1).map((x) => cell(x)).join("")} Name`;
    const good = ["100", "90", "80", "70", "60", "50", "40", "30", "20", "10", "10"];
    const bad = ["100", "90", "80", "70", "60", "5\u0000", "40", "30", "20", "10", "10"];
    const p = parse1990s([row("01001", good), row("49041", bad), "2  01001 123"].join("\n"));
    expect(p.get(1999)!.get("01001")).toBe(100);
    expect(p.get(1990)!.get("01001")).toBe(10);
    expect(p.get(1994)!.get("49041")).toBe(50); // halfway between 1995 (60) and 1993 (40)
  });
  it("reads county rows of the 2000s/2010s csv", () => {
    const p = parseCsv(["SUMLEV,STATE,COUNTY,POPESTIMATE2000,POPESTIMATE2001", "040,12,000,9,9", "050,12,086,5,6"].join("\n"), 2000, 2001);
    expect(p.get(2001)!.get("12086")).toBe(6);
    expect(p.get(2000)!.size).toBe(1);
    expect(() => parseCsv("SUMLEV,STATE,COUNTY\n", 2000, 2000)).toThrow(/POPESTIMATE2000/);
  });
});
