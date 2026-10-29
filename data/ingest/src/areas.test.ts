import { describe, expect, it } from "vitest";
import { acsId, inAcsStates, metroRow } from "./areas.ts";

describe("metroRow", () => {
  it("names a metro the way search lists it, with a tagged code", () => {
    expect(metroRow("Minneapolis-St. Paul-Bloomington, MN-WI Metro Area", "33460", 18254e6, [-94.26, 44.2, -92.14, 46.25]))
      .toEqual(["Minneapolis-St. Paul-Bloomington, MN-WI", "Metro area", "cbsa33460", -93.2, 45.225, 7048, "MN, WI", [-94.26, 44.2, -92.14, 46.25]]);
    expect(metroRow("Aberdeen, SD Micro Area", "10100", 1, [0, 0, 1, 1])[1]).toBe("Micro area");
  });
  it("refuses a name it doesn't understand", () => {
    expect(() => metroRow("Somewhere", "1", 1, [0, 0, 1, 1])).toThrow();
  });
});

describe("city filters", () => {
  it("drops places in territories ACS doesn't cover, keeps states, DC and Puerto Rico", () => {
    for (const g of ["6900300", "7816300", "6000100", "6600100"]) expect(inAcsStates(g)).toBe(false);
    for (const g of ["2743000", "1150000", "7276770"]) expect(inAcsStates(g)).toBe(true);
  });
  it("reads Louisville's numbers from its ACS balance place, everyone else from themselves", () => {
    expect(acsId("2148000")).toBe("2148006");
    expect(acsId("4752006")).toBe("4752006");
  });
});
