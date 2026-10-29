import { describe, expect, it } from "vitest";
import { mpoById, normalizeName, placeByGeoid, searchPlaces, type PlaceRow } from "./search";

// Rows from the live geo/search.json (issue #258): every county starting "Du" or "Cook", and the places tested.
const ROWS: PlaceRow[] = [
  ["Duval County, FL", "County", "12031", -81.6481, 30.3352, 763],
  ["Cook County, GA", "County", "13075", -83.4294, 31.1525, 228],
  ["Cook County, IL", "County", "17031", -87.6455, 41.8943, 945],
  ["DuPage County, IL", "County", "17043", -88.086, 41.8521, 328],
  ["Dubois County, IN", "County", "18037", -86.8734, 38.3733, 427],
  ["Dubuque County, IA", "County", "19061", -90.8788, 42.4635, 608],
  ["Dukes County, MA", "County", "25007", -70.7015, 41.381, 103],
  ["Cook County, MN", "County", "27031", -90.3443, 47.7586, 1453],
  ["Hennepin County, MN", "County", "27053", -93.4752, 45.0061, 554],
  ["Dunklin County, MO", "County", "29069", -90.0623, 36.153, 542],
  ["Texas County, MO", "County", "29215", -91.9645, 37.3143, 1177],
  ["Dundy County, NE", "County", "31057", -101.6811, 40.1802, 920],
  ["Dutchess County, NY", "County", "36027", -73.74, 41.7548, 796],
  ["Duplin County, NC", "County", "37061", -77.9335, 34.9344, 815],
  ["Durham County, NC", "County", "37063", -78.8781, 36.0338, 288],
  ["Dunn County, ND", "County", "38025", -102.6123, 47.3546, 2008],
  ["Texas County, OK", "County", "40139", -101.4839, 36.7463, 2041],
  ["Cooke County, TX", "County", "48097", -97.2103, 33.6392, 875],
  ["Duval County, TX", "County", "48131", -98.4974, 27.6811, 1793],
  ["Duchesne County, UT", "County", "49013", -110.4296, 40.2894, 3236],
  ["Dunn County, WI", "County", "55033", -91.8976, 44.9478, 850],
  ["Minnesota", "State", "27", -94.3235, 46.2216, 79632],
  ["Texas", "State", "48", -99.377, 31.4429, 261259],
  ["Durham, CA", "Community", "", -121.7908, 39.6294, 82],
  ["Hennepin, IL", "Village", "", -89.3141, 41.2505, 5],
  ["Minneapolis, KS", "City", "", -97.6997, 39.1243, 2],
  ["Cook, MN", "City", "", -92.6888, 47.8357, 3],
  ["Duluth, MN", "City", "", -92.1341, 46.7745, 72],
  ["Minneapolis, MN", "City", "", -93.2683, 44.9633, 54],
  ["Durham, NC", "City", "", -78.8981, 35.9779, 119],
  ["Duncan, OK", "City", "", -97.9605, 34.4816, 43],
  ["Cookeville, TN", "City", "", -85.5127, 36.1469, 36],
  ["Texas City, TX", "City", "", -94.8927, 29.4337, 66],
];
const names = (q: string) => searchPlaces(ROWS, q).map((h) => h.name);

describe("searchPlaces", () => {
  it("keeps cities in view for a short prefix that matches many counties", () => {
    expect(names("Du").slice(0, 5)).toContain("Duluth, MN");
    expect(names("Du")).toHaveLength(6);
  });
  it("still puts the obvious place first", () => {
    expect(names("Hennepin")[0]).toBe("Hennepin County, MN");
    expect(names("Cook")[0]).toBe("Cook County, MN");
    expect(names("Cook")).toContain("Cook County, IL");
    expect(names("Minneapolis")[0]).toBe("Minneapolis, MN");
    expect(names("Texas")[0]).toBe("Texas");
  });
  it("lets counties fill the list when few places match", () => {
    expect(searchPlaces(ROWS.filter((r) => r[1] === "County"), "Du")).toHaveLength(6);
  });
});

describe("MPOs in place search (issue #276)", () => {
  const mpo: PlaceRow = ["Metropolitan Council", "MPO", "27197300", -93.3, 44.97, 3040, "MN", [-94.01, 44.47, -92.73, 45.41]];
  const rows: PlaceRow[] = [...ROWS, mpo];
  it("finds one by name or by its kind, with its id, states and bbox", () => {
    expect(searchPlaces(rows, "metropolitan council")[0]).toMatchObject({ kind: "MPO", geoid: null, level: null, mpo: { id: "27197300", states: "MN", bbox: mpo[7] } });
    expect(searchPlaces(rows, "MPO").map((h) => h.name)).toEqual(["Metropolitan Council"]);
  });
  it("lists MPOs ahead of names that merely contain 'mpo' (Emporia, Lompoc)", () => {
    const more: PlaceRow[] = [["Emporia, VA", "City", "", -77.5, 36.7, 7], ["Lompoc, CA", "City", "", -120.4, 34.6, 12], ...rows];
    expect(searchPlaces(more, "mpo")[0]).toMatchObject({ kind: "MPO" });
    expect(searchPlaces(more, "mpo", 6).map((h) => h.name)).toContain("Emporia, VA");
  });
  it("never answers a geoid lookup", () => {
    expect(placeByGeoid(rows, "27197300")).toBeNull();
    expect(mpoById(rows, "27197300")?.name).toBe("Metropolitan Council");
  });
});

describe("Saint/St., Twin Cities (issue #289)", () => {
  const more: PlaceRow[] = [
    ["St. Paul, MN", "City", "", -93.1, 44.95, 52], ["Stillwater, MN", "City", "", -92.8, 45.05, 7],
    ["Sault Ste. Marie, MI", "City", "", -84.3, 46.5, 15], ["Twin Cities Area Transportation Study (TwinCATS)", "MPO", "26001", -85, 42, 10, "MI", [0, 0, 1, 1]],
    ["Metropolitan Council", "MPO", "27197300", -93.37, 44.94, 3040, "MN", [0, 0, 1, 1]],
  ];
  const f = (q: string) => searchPlaces(more, q).map((h) => h.name);
  it("normalizes abbreviations", () => {
    expect(normalizeName("St. Paul, MN")).toBe("saint paul, mn");
    expect(normalizeName("Sault Ste. Marie, MI")).toBe("sault sainte marie, mi");
    expect(normalizeName("Mt. Vernon, Ft Worth,")).toBe("mount vernon, fort worth,");
  });
  it("finds St. Paul however it is spelled", () => {
    for (const q of ["saint paul", "st paul", "St. Paul"]) expect(f(q)[0]).toBe("St. Paul, MN");
  });
  it("a half-typed st still finds Stillwater", () => expect(f("st")).toContain("Stillwater, MN"));
  it("twin cities finds the Metropolitan Council first", () => expect(f("Twin Cities")[0]).toBe("Metropolitan Council"));
});

describe("cities and metro areas in place search (issue #332)", () => {
  const metro: PlaceRow = ["Minneapolis-St. Paul-Bloomington, MN-WI", "Metro area", "cbsa33460", -93.2, 45.22, 7048, "MN, WI", [-94.26, 44.2, -92.14, 46.25]];
  const rows: PlaceRow[] = [...ROWS.map((r): PlaceRow => (r[0] === "Minneapolis, MN" ? [r[0], r[1], "place2743000", r[3], r[4], r[5]] : r)), metro];
  it("a city with a code is an area, never a geography level", () => {
    expect(searchPlaces(rows, "Minneapolis")[0]).toMatchObject({ name: "Minneapolis, MN", kind: "City", geoid: null, level: null, area: "place2743000" });
    expect(searchPlaces(rows, "Minneapolis").map((h) => h.kind)).toContain("Metro area");
    expect(placeByGeoid(rows, "place2743000")).toMatchObject({ area: "place2743000" }); // tagged codes can't collide with GEOIDs
  });
  it("'metro' and dashes find the metro first", () => {
    for (const q of ["Minneapolis metro", "minneapolis metro area", "Minneapolis–St. Paul", "Minneapolis-St Paul"])
      expect(searchPlaces(rows, q)[0], q).toMatchObject({ kind: "Metro area", area: "cbsa33460" });
  });
});
