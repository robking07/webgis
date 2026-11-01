import { describe, expect, it } from "vitest";
import { historyKey, parseUrlState, searchHref, serializeUrlState } from "./url-state";

describe("searchHref (search off the map, issue #438)", () => {
  it("links a dataset, a county (focused), a city and an MPO", () => {
    expect(searchHref("asthma")).toBe("/map?d=asthma");
    expect(searchHref(null, { name: "Cook County, IL", kind: "County", geoid: "17031", level: "county", lon: -87.75, lat: 41.84, sqmi: 945 })).toMatch(/^\/map\?at=-87\.7500,41\.8400,[\d.]+&in=17031$/);
    expect(searchHref("asthma", { name: "Duluth", kind: "City", geoid: null, level: null, lon: -92.1, lat: 46.8, sqmi: 87, area: "place2717000" })).toMatch(/^\/map\?d=asthma&at=.+&area=place2717000$/);
    expect(searchHref(null, { name: "Met Council", kind: "MPO", geoid: null, level: null, lon: -93.3, lat: 45, sqmi: 3000, mpo: { id: "27MC", states: "MN", bbox: [-94, 44, -92, 46] } })).toMatch(/&mpo=27MC$/);
  });
});

describe("historyKey", () => {
  const base = parseUrlState("?d=a&at=-93,45,7");
  it("ignores pan, zoom and theme", () => {
    expect(historyKey({ ...base, at: { lon: 1, lat: 2, zoom: 3 }, theme: "dark" })).toBe(historyKey(base));
  });
  it("changes with dataset, second dataset, level, period and focused place", () => {
    const k = historyKey(base);
    for (const patch of [{ d: "x" }, { b: "y" }, { lv: "county" as const }, { t: "2019" }, { since: "2015" }, { in: "48" }])
      expect(historyKey({ ...base, ...patch })).not.toBe(k);
  });
});

describe("in (drill-down focus)", () => {
  it("round-trips a GEOID and rejects anything else", () => {
    expect(parseUrlState("?in=48113").in).toBe("48113");
    expect(parseUrlState("?in=4").in).toBeNull();
    expect(parseUrlState("?in=48x").in).toBeNull();
    expect(serializeUrlState(parseUrlState("?d=a&in=48113"))).toContain("in=48113");
  });
});

describe("mpo (a searched MPO, issue #276)", () => {
  it("round-trips an MPO id, adds a Back step, and rejects anything else", () => {
    expect(parseUrlState("?mpo=27197300").mpo).toBe("27197300");
    expect(parseUrlState("?mpo=../x").mpo).toBeNull();
    expect(serializeUrlState(parseUrlState("?d=a&mpo=27197300"))).toContain("mpo=27197300");
    const base = parseUrlState("?d=a");
    expect(historyKey({ ...base, mpo: "27197300" })).not.toBe(historyKey(base));
  });
});

describe("area (issue #332)", () => {
  it("keeps a city or metro code and drops anything else", () => {
    expect(parseUrlState("?area=cbsa33460").area).toBe("cbsa33460");
    expect(parseUrlState("?area=place2743000").area).toBe("place2743000");
    expect(parseUrlState("?area=27053").area).toBeNull();
    expect(serializeUrlState({ ...parseUrlState("?d=median_household_income"), area: "cbsa33460" })).toContain("area=cbsa33460");
  });
});

describe("context=preview", () => {
  it("survives a round trip, so moving the map keeps it", () => {
    const s = parseUrlState("?d=traffic_fatalities&context=preview");
    expect(serializeUrlState({ ...s, at: { lon: -93, lat: 45, zoom: 8 } })).toContain("context=preview");
    expect(serializeUrlState(parseUrlState("?context=other"))).not.toContain("context");
  });
});
