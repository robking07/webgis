import { describe, expect, it } from "vitest";
import { backLabel, isRaceRow, placeHref } from "./place";
import { DATASET_BY_ID } from "./registry";

describe("backLabel", () => {
  it("names where Back goes (issue #437)", () => {
    expect(backLabel()).toBe("Back to national view");
    expect(backLabel({ geoid: "27", name: "Minnesota" })).toBe("Back to Minnesota view");
    expect(backLabel({ geoid: "27053", name: "Hennepin County, Minnesota" })).toBe("Back to Hennepin County");
    expect(backLabel({ geoid: "27053026100", name: "Census tract 261" })).toBe("Back to tract");
    expect(backLabel({ geoid: "270530261001", name: "Block group 1" })).toBe("Back to block group");
    expect(backLabel({ geoid: "27", name: "" })).toBe("Back to previous view");
  });
});

describe("isRaceRow", () => {
  it("is true for every Race and ethnicity dataset, false for others", () => {
    expect(isRaceRow(DATASET_BY_ID.get("pct_people_of_color"))).toBe(true);
    expect(isRaceRow(DATASET_BY_ID.get("pct_poverty"))).toBe(false);
  });
});

describe("placeHref", () => {
  it("carries the map's dataset, if any", () => {
    expect(placeHref("27053")).toBe("/place/27053");
    expect(placeHref("27053", "pct_poverty")).toBe("/place/27053?d=pct_poverty");
  });
});
