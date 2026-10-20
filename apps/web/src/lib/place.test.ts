import { describe, expect, it } from "vitest";
import { placeHref } from "./place";

describe("placeHref", () => {
  it("carries the map's dataset, if any", () => {
    expect(placeHref("27053")).toBe("/place/27053");
    expect(placeHref("27053", "pct_poverty")).toBe("/place/27053?d=pct_poverty");
  });
});
