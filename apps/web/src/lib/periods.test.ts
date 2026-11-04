import { describe, expect, it } from "vitest";
import { areaChangeNote, changeEnds, noTractsNote, restatesDollars, type Stop } from "./periods";

const stop = (id: string, isDefault = false) => ({ id, label: id, isDefault, levels: [] }) as unknown as Stop;
// A climate map: years, and a normal as the default.
const stops = [stop("1991"), stop("2000"), stop("2010"), stop("2024"), stop("normal", true)];

describe("changeEnds", () => {
  it("runs from since to the year t", () => expect(changeEnds(stops, "2010", "1991")).toMatchObject({ from: { id: "1991" }, to: { id: "2010" } }));
  it("runs to the latest year when t is absent (old since= links) or the normal", () => {
    expect(changeEnds(stops, null, "2000")?.to.id).toBe("2024");
    expect(changeEnds(stops, "normal", "2000")?.to.id).toBe("2024");
  });
  it("falls back to the latest year when since isn't before t", () => expect(changeEnds(stops, "2000", "2010")).toMatchObject({ from: { id: "2010" }, to: { id: "2024" } }));
  it("is null without a valid since", () => {
    expect(changeEnds(stops, "2010", null)).toBeNull();
    expect(changeEnds(stops, null, "2024")).toBeNull();
  });
});

describe("older-year notes (#507)", () => {
  const old = { id: "2009", label: "2005–2009", isDefault: false, levels: ["state", "county"], boundaries: "2019" } as Stop;
  const now = { id: "2024", label: "2020–2024", isDefault: true, levels: ["state", "county", "tract"] } as Stop;
  it("says why an older stop has no tracts, only where the map has them", () => {
    expect(noTractsNote(old, ["state", "county", "tract"])).toMatch(/^2005–2009 is available for states and counties only/);
    expect(noTractsNote(old, ["state", "county"])).toBeNull();
    expect(noTractsNote(now, ["state", "county", "tract"])).toBeNull();
    expect(noTractsNote(null, ["tract"])).toBeNull();
  });
  it("names the Valdez–Cordova split for its two successors", () => {
    expect(areaChangeNote(old, now, "county", "02063")).toMatch(/Valdez–Cordova in 2019/);
    expect(areaChangeNote(old, now, "county", "02066")).toMatch(/Valdez–Cordova in 2019/);
    expect(areaChangeNote(old, now, "county", "27053")).toBeNull();
  });
});

describe("restatesDollars (#530)", () => {
  const d = (kind: string, unit = "dollars") => ({ unit, measure: { kind } }) as never;
  it("is true for ACS and QCEW dollars only", () => {
    expect(restatesDollars(d("acs5"))).toBe(true);
    expect(restatesDollars(d("qcew"))).toBe(true);
    expect(restatesDollars(d("lead"))).toBe(false);
    expect(restatesDollars(d("fema_nri"))).toBe(false);
    expect(restatesDollars(d("qcew", "jobs_per_1k"))).toBe(false);
  });
});
