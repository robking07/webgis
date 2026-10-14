import { describe, expect, it } from "vitest";
import { historyKey, parseUrlState } from "./url-state";

describe("historyKey", () => {
  const base = parseUrlState("?d=a&at=-93,45,7");
  it("ignores pan, zoom and theme", () => {
    expect(historyKey({ ...base, at: { lon: 1, lat: 2, zoom: 3 }, theme: "dark" })).toBe(historyKey(base));
  });
  it("changes with dataset, second dataset, level and period", () => {
    const k = historyKey(base);
    for (const patch of [{ d: "x" }, { b: "y" }, { lv: "county" as const }, { t: "2019" }, { since: "2015" }])
      expect(historyKey({ ...base, ...patch })).not.toBe(k);
  });
});
