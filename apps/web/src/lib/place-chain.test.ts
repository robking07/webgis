import { describe, expect, it, vi } from "vitest";
import type { Polygon, MultiPolygon } from "geojson";
import { cityCandidates, placeChain, pointIn } from "./place-chain";
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

describe("placeChain", () => {
  // Rows as the live files have them; outlines are boxes around Duluth and its metro.
  const box = (b: number[]) => ({ type: "Polygon", coordinates: [square(b[0], b[1], b[2], b[3])] });
  const DULUTH = [-92.4, 46.6, -91.9, 46.9], METRO = [-93.1, 46.2, -91.0, 48.4];
  const files: Record<string, unknown> = {
    "geo/search.json": [
      ["Minnesota", "State", "27", -94.3235, 46.2216, 79632], ["St. Louis County, MN", "County", "27137", -92.5146, 47.5786, 6248],
      ["Duluth, MN", "City", "place2717000", -92.1341, 46.7745, 72],
      ["District of Columbia", "State", "11", -77.0165, 38.9042, 61], ["District of Columbia, DC", "County", "11001", -77.0165, 38.9042, 61],
    ],
    "/mpo/index.json": [["Duluth-Superior Metropolitan Interstate Council", "MPO", "27197500", -92.1, 46.7, 300, "MN, WI", DULUTH]],
    "areas/index.json": [["Duluth, MN-WI", "Metro area", "cbsa20260", -92.4, 47.2, 10000, "MN, WI", METRO]],
    "areas/cbsa20260.json": { v: {}, g: box(METRO), b: METRO },
    "areas/place2717000.json": { v: {}, g: box(DULUTH), b: DULUTH },
    "/mpo/27197500.json": box(DULUTH),
    "/mpo/counties.json": { "27197500": [["27137", 0.6], ["55031", 1]] },
  };
  vi.stubGlobal("fetch", async (url: string) => {
    const key = Object.keys(files).find((k) => url.endsWith(k));
    return key ? new Response(JSON.stringify(files[key])) : new Response("", { status: 404 });
  });
  const names = async (...a: Parameters<typeof placeChain>) => (await placeChain(...a)).map((p) => `${p.kind}:${p.name.split(",")[0]}`);

  it("lists state › MPO › metro › county › city for a tract, keeping a city named like its metro", async () => {
    expect(await names("27137001500", "tract", -92.1, 46.78)).toEqual(["State:Minnesota", "MPO:Duluth-Superior Metropolitan Interstate Council", "Metro area:Duluth", "County:St. Louis County", "City:Duluth"]);
  });
  it("takes a county's MPO by the half rule and leaves out what the county holds", async () => {
    expect(await names("27137", "county", -92.5, 47.5)).toEqual(["State:Minnesota", "MPO:Duluth-Superior Metropolitan Interstate Council", "Metro area:Duluth"]);
  });
  it("lists D.C. once, with no city or MPO outside every outline", async () => {
    expect(await names("11001006202", "tract", -77.03, 38.9)).toEqual(["State:District of Columbia"]);
  });
});
