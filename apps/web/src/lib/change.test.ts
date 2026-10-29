import { describe, expect, it } from "vitest";
import { changeMeasure, changeOf, changeSummary, classifyChange, differenceMoe, formatChange, withinMoe } from "./change";
import { changeStops, latestStop, type Stop } from "./periods";

describe("change measure", () => {
  it("uses points for percentages, percent change for counts and amounts, a difference otherwise", () => {
    expect(changeMeasure("percent")).toBe("points");
    expect(changeMeasure("count")).toBe("percent");
    expect(changeMeasure("dollars")).toBe("percent");
    expect(changeMeasure("per_sq_mi")).toBe("percent");
    expect(changeMeasure("per_100k")).toBe("difference");
    expect(changeMeasure("deg_f")).toBe("difference");
  });

  it("subtracts for points, divides by the earlier value for percent", () => {
    expect(changeOf(12.5, 10, "points")).toBeCloseTo(-2.5);
    expect(changeOf(200, 250, "percent")).toBeCloseTo(25);
    expect(changeOf(-4, -2, "percent")).toBeCloseTo(50);
  });

  it("is missing when either year is missing", () => {
    expect(changeOf(undefined, 10, "points")).toBeNull();
    expect(changeOf(10, null, "points")).toBeNull();
    expect(changeOf(NaN, 10, "difference")).toBeNull();
  });

  it("has no percent change from a zero base, except zero to zero", () => {
    expect(changeOf(0, 5, "percent")).toBeNull();
    expect(changeOf(0, 0, "percent")).toBe(0);
    expect(changeOf(0, 5, "points")).toBe(5);
  });
});

describe("margin of error of a change", () => {
  it("combines both margins as √(MOE₁² + MOE₂²)", () => {
    expect(differenceMoe(10, 3, 12, 4)).toBeCloseTo(5);
  });

  it("assumes the later relative margin when the earlier one is unknown", () => {
    // MOE₁ ≈ 4 · 10/20 = 2 → √(4 + 16)
    expect(differenceMoe(10, null, 20, 4)).toBeCloseTo(Math.sqrt(20));
    expect(differenceMoe(10, null, 0, 4)).toBeCloseTo(Math.sqrt(32));
  });

  it("can't test without the later margin", () => {
    expect(differenceMoe(10, 3, 12, null)).toBeNull();
    expect(withinMoe(10, 12, null)).toBe(false);
  });

  it("calls a change within the margin no clear change, one past it clear", () => {
    expect(withinMoe(10, 15, 5)).toBe(true);
    expect(withinMoe(10, 15.01, 5)).toBe(false);
    expect(withinMoe(10, 4.9, 5)).toBe(false);
  });
});

describe("classifyChange", () => {
  const from = { a: 10, b: 10, c: 10, d: 10, e: 10, f: 10, g: 10, z: 7 };
  const to = { a: 4, b: 8, c: 9, d: 10, e: 11, f: 12, g: 16, y: 3 };

  it("puts falls below the middle and rises above it, with the same cut-offs both ways", () => {
    const c = classifyChange(from, to, "percent");
    expect(c.measure).toBe("points");
    expect(c.colors).toHaveLength(7);
    expect(c.classes.get("d")).toBe(3);
    expect(c.classes.get("a")).toBe(0);
    expect(c.classes.get("g")).toBe(6);
    expect(c.classes.get("c")! + c.classes.get("e")!).toBe(6);
    expect(c.classes.get("b")! + c.classes.get("f")!).toBe(6);
    expect(c.labels[3]).toBe("No change");
    expect(c.tested).toBe(false);
  });

  it("rounds the cut-offs to one figure so the legend reads ±2, ±5", () => {
    const f = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 };
    const c = classifyChange(f, { a: 1.2, b: 1.87, c: 2.5, d: 4.6, e: 5.4, f: 9 }, "percent");
    expect(c.ends).toEqual(["−5.0 pts", "+5.0 pts"]);
  });

  it("leaves areas missing in either year out", () => {
    const c = classifyChange(from, to, "percent");
    expect(c.classes.has("y")).toBe(false);
    expect(c.classes.has("z")).toBe(false);
    expect(c.change.y).toBeUndefined();
  });

  it("moves changes within the margin of error to the middle", () => {
    const c = classifyChange(from, to, "percent", { g: 10, a: 1 });
    expect(c.tested).toBe(true);
    expect(c.labels[3]).toBe("No clear change");
    expect(c.classes.get("g")).toBe(3); // +6 within √(MOE₁² + 10²)
    expect(c.classes.get("a")).toBe(0); // −6 well past ≈1.6
  });

  it("drops a zero base from a percent-change map", () => {
    const c = classifyChange({ a: 0, b: 100 }, { a: 50, b: 150 }, "count");
    expect(c.classes.has("a")).toBe(false);
    expect(c.change.b).toBeCloseTo(50);
  });
});

describe("formatChange", () => {
  it("signs and labels the change", () => {
    expect(formatChange(2.34, "points", "percent")).toBe("+2.3 pts");
    expect(formatChange(-12.4, "percent", "count")).toBe("−12%");
    expect(formatChange(0, "points", "percent")).toBe("0.0 pts");
    expect(formatChange(-1.5, "difference", "deg_f")).toBe("−1.5°F");
    expect(formatChange(null, "points", "percent")).toBe("No data");
  });
});

describe("changeStops", () => {
  const s = (id: string, isDefault = false): Stop => ({ id, label: id, isDefault, levels: ["county"] });
  it("offers earlier dated stops, newest first, and none from an average", () => {
    const acs = [s("2014"), s("2019"), s("2024", true)];
    expect(changeStops(acs, acs[2]).map((x) => x.id)).toEqual(["2019", "2014"]);
    expect(changeStops(acs, acs[0])).toEqual([]);
    const fars = [s("2019"), s("2020"), s("avg", true)];
    expect(changeStops(fars, fars[2])).toEqual([]);
    expect(changeStops(fars, fars[1]).map((x) => x.id)).toEqual(["2019"]);
  });
});

describe("changeSummary", () => {
  it("leads with the change, or no clear change, with both values after", () => {
    expect(changeSummary(2.34, 10, 12.34, "points", "percent", false)).toEqual({ headline: "+2.3 pts", values: ["10%", "12.3%"] });
    expect(changeSummary(-0.5, 12.84, 12.34, "points", "percent", false).values).toEqual(["12.8%", "12.3%"]);
    expect(changeSummary(0.8, 10, 10.8, "points", "percent", true).headline).toBe("No clear change");
  });
  it("says why an area has no change", () => {
    expect(changeSummary(null, undefined, 12, "points", "percent", false, "tract changed in 2020").headline).toBe("No data: tract changed in 2020");
    expect(changeSummary(null, 0, 12, "percent", "count", false).headline).toBe("No data: no earlier amount");
    expect(changeSummary(null, undefined, undefined, "points", "percent", false, "tract changed in 2020").headline).toBe("No data");
  });
});

describe("latestStop", () => {
  const s = (id: string, isDefault = false): Stop => ({ id, label: id, isDefault, levels: ["county"] });
  it("is the default when it's a year, else the newest year", () => {
    expect(latestStop([s("2014"), s("2019"), s("2024", true)])?.id).toBe("2024");
    expect(latestStop([s("2019"), s("2020"), s("avg", true)])?.id).toBe("2020");
    expect(latestStop([])).toBeNull();
  });
});
