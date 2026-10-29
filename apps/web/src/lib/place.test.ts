import { describe, expect, it } from "vitest";
import { isRaceRow, placeHref } from "./place";
import { DATASET_BY_ID } from "./registry";

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
