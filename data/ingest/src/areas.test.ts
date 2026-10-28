import { describe, expect, it } from "vitest";
import { metroRow } from "./areas.ts";

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
