import { describe, expect, it } from "vitest";
import { searchPlaces, type PlaceRow } from "./search";

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
