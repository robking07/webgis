import { describe, expect, it } from "vitest";
import type { Polygon, MultiPolygon } from "geojson";
import { cityCandidates, pointIn } from "./place-chain";
import type { PlaceRow } from "./search";

const square = (x0: number, y0: number, x1: number, y1: number) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];

describe("pointIn", () => {
  const donut: Polygon = { type: "Polygon", coordinates: [square(0, 0, 10, 10), square(4, 4, 6, 6)] };
  it("is inside a polygon, outside its hole and outside the polygon", () => {
    expect(pointIn(donut, [1, 1])).toBe(true);
    expect(pointIn(donut, [5, 5])).toBe(false);
    expect(pointIn(donut, [11, 5])).toBe(false);
  });
  it("finds a point in any part of a MultiPolygon", () => {
    const two: MultiPolygon = { type: "MultiPolygon", coordinates: [[square(0, 0, 1, 1)], [[...square(5, 5, 6, 6)]]] };
    expect(pointIn(two, [5.5, 5.5])).toBe(true);
    expect(pointIn(two, [3, 3])).toBe(false);
  });
});

// Rows from the live geo/search.json.
const ROWS: PlaceRow[] = [
  ["Edina, MN", "City", "place2718188", -93.3598, 44.8911, 15],
  ["Minneapolis, MN", "City", "place2743000", -93.2683, 44.9633, 54],
  ["Duluth, MN", "City", "place2717000", -92.1251, 46.7833, 68],
  ["Minneapolis, KS", "City", "place2047075", -97.6997, 39.1243, 2],
  ["Hennepin County, MN", "County", "27053", -93.4752, 45.0061, 554],
];

describe("cityCandidates", () => {
  it("lists nearby cities in the same state, likeliest first (distance over size)", () => {
    // A spot in south Minneapolis, near the Edina line.
    expect(cityCandidates(ROWS, "27", [-93.30, 44.91]).map((r) => r[0])).toEqual(["Minneapolis, MN", "Edina, MN"]);
  });
  it("skips other states and far cities", () => {
    expect(cityCandidates(ROWS, "20", [-93.30, 44.91])).toEqual([]);
  });
});
