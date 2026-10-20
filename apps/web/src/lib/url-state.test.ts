import { describe, expect, it } from "vitest";
import { historyKey, parseUrlState, serializeUrlState } from "./url-state";

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
