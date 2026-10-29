import { describe, expect, it } from "vitest";
import { countyShares, inShape } from "./mpo.ts";

const square = (w: number, s: number, e: number, n: number) => [[w, s], [e, s], [e, n], [w, n], [w, s]];

describe("MPO counties (#292)", () => {
  it("tests points against polygons, holes and multipolygons", () => {
    const donut = { type: "Polygon" as const, coordinates: [square(0, 0, 10, 10), square(4, 4, 6, 6)] };
    expect(inShape(donut, 1, 1)).toBe(true);
    expect(inShape(donut, 5, 5)).toBe(false);
    expect(inShape(donut, 11, 5)).toBe(false);
    const two = { type: "MultiPolygon" as const, coordinates: [[square(0, 0, 1, 1)], [square(5, 5, 6, 6)]] };
    expect(inShape(two, 5.5, 5.5)).toBe(true);
    expect(inShape(two, 3, 3)).toBe(false);
  });
  it("gives each county's share of residents inside, rounded down, whole counties as 1, cut ones with their tracts inside", () => {
    const shapes = new Map([["m1", { type: "Polygon" as const, coordinates: [square(0, 0, 10, 10)] }]]);
    const out = countyShares(shapes, [
      ["27003", 100, 1, 1, "000100"], ["27003", 50, 2, 2, "000200"], // all inside
      ["27141", 1, 9, 9, "030502"], ["27141", 0, 8, 8, "030501"], ["27141", 2, 20, 20, "030600"], // a third inside: 0.333; the empty tract inside is listed too
      ["27999", 10, 30, 30, "000100"], // none inside: left out
      ["27777", 0, 5, 5, "000100"], // only an empty tract inside: no residents, left out
      ["27053", 99, 3, 3, "000100"], ["27053", 1, 40, 40, "000200"], // 99% inside: counts as whole, no tract list
    ]);
    expect(out.m1).toEqual([["27003", 1], ["27053", 0.99], ["27141", 0.333, ["030501", "030502"]]]);
  });
});
