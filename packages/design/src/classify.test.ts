import { describe, expect, it } from "vitest";
import { classify, classifyValues, classOf, niceBreaks } from "./classify.ts";

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("classify", () => {
  it("quantile: n-1 interior breaks", () => {
    expect(classify(range(10), { method: "quantile", classes: 2 })).toEqual([5.5]);
    expect(classify(range(100), { method: "quantile", classes: 4 })).toHaveLength(3);
  });
  it("quantile: mass at the minimum becomes its own bottom class", () => {
    const v = [0, 0, 0, 0, 0, 0, 1, 2, 3, 4];
    const b = classify(v, { method: "quantile", classes: 3 });
    expect(b[0]).toBe(1);
    expect(classOf(0, b)).toBe(0);
    expect(classOf(1, b)).toBe(1);
  });
  it("quantile: all values equal gives no breaks", () => {
    expect(classify([5, 5, 5], { method: "quantile", classes: 4 })).toEqual([]);
  });
  it("equal interval", () => {
    expect(classify([0, 100], { method: "equalInterval", classes: 4 })).toEqual([25, 50, 75]);
  });
  it("jenks separates clear clusters", () => {
    expect(classify([1, 2, 3, 50, 51, 52, 100, 101], { method: "jenks", classes: 3 })).toEqual([50, 100]);
  });
  it("manual needs n-1 breaks", () => {
    expect(classify([1, 2], { method: "manual", classes: 3, breaks: [10, 20] })).toEqual([10, 20]);
    expect(() => classify([1, 2], { method: "manual", classes: 3, breaks: [10] })).toThrow();
  });
  it("ignores non-finite values and handles empty input", () => {
    expect(classify([NaN, Infinity], { method: "quantile", classes: 3 })).toEqual([]);
    expect(classify([], { method: "jenks", classes: 3 })).toEqual([]);
  });
});

describe("niceBreaks", () => {
  it("rounds to 2 significant figures: dollars, percent, negatives", () => {
    expect(niceBreaks([69820, 75068, 79368, 94770], 20000, 250000)).toEqual([70000, 75000, 79000, 95000]);
    expect(niceBreaks([9.314, 12.06], 0, 100)).toEqual([9.3, 12]);
    expect(niceBreaks([-12.34, -0.567, 3.21], -50, 50)).toEqual([-12, -0.57, 3.2]);
  });
  it("adds figures rather than merge two breaks into one", () => {
    expect(niceBreaks([75068, 75400, 79368], 0, 1e6)).toEqual([75100, 75400, 79400]);
  });
  it("tiny ranges keep enough figures to stay distinct", () => {
    expect(niceBreaks([1000.21, 1000.34], 1000.1, 1000.5)).toEqual([1000.2, 1000.3]);
    expect(niceBreaks([0.00123, 0.00187], 0.001, 0.002)).toEqual([0.0012, 0.0019]);
  });
  it("never empties the end classes", () => {
    expect(niceBreaks([5.04, 6], 5, 9)).toEqual([5.04, 6]); // 5.0 would leave nothing below the first break
    expect(niceBreaks([3, 9.96], 0, 9.97)).toEqual([3, 9.96]); // 10 would leave nothing at or above the last
  });
  it("classify returns rounded breaks; places still fall in the class their value says", () => {
    const v = Array.from({ length: 101 }, (_, i) => 50000 + i * 523);
    const b = classify(v, { method: "quantile", classes: 5 });
    expect(b.every((x) => Number(x.toPrecision(2)) === x)).toBe(true);
    const c = classifyValues({ ramp: "viridis", classification: "quantile", classes: 5 }, v);
    expect(c.breaks).toEqual(b);
    v.forEach((x, i) => expect(c.cls[i]).toBe(classOf(x, b)));
  });
});

describe("classOf", () => {
  it("counts the breaks at or below the value", () => {
    expect(classOf(5, [10, 20])).toBe(0);
    expect(classOf(10, [10, 20])).toBe(1);
    expect(classOf(25, [10, 20])).toBe(2);
    expect(classOf(3, [])).toBe(0);
  });
});

describe("classifyValues", () => {
  const sym = { ramp: "viridis", classification: "quantile" as const, classes: 3 };
  it("one class per value, colors from the ramp", () => {
    const c = classifyValues(sym, [1, 2, 3, 4, 5, 6]);
    expect([...c.cls]).toEqual([0, 0, 1, 1, 2, 2]);
    expect(c.colors).toHaveLength(c.breaks.length + 1);
    expect(c.minClass).toBeUndefined();
  });
  it("skewed data: the bottom class is exactly the minimum", () => {
    expect(classifyValues(sym, [0, 0, 0, 0, 1, 2, 3]).minClass).toBe(0);
  });
  it("breaksFrom: breaks come from the other values", () => {
    expect([...classifyValues(sym, [5, 5], [1, 2, 3, 10, 11, 12]).cls]).toEqual([1, 1]);
  });
});
