import { describe, expect, it } from "vitest";
import { classLabels, formatEstimate, formatValue } from "./format.ts";

describe("formatValue", () => {
  it("formats by unit", () => {
    expect(formatValue(64450, "dollars")).toBe("$64,450");
    expect(formatValue(0.16, "dollars")).toBe("$0.16");
    expect(formatValue(3.5, "dollars")).toBe("$3.50");
    expect(formatValue(0, "dollars")).toBe("$0");
    expect(formatValue(12.345, "percent")).toBe("12%");
    expect(formatValue(5.25, "percent")).toBe("5.3%");
    expect(formatValue(0.456, "percent")).toBe("0.46%");
    expect(formatValue(0, "percent")).toBe("0%");
    expect(formatValue(23.44, "minutes")).toBe("23.4 min");
    expect(formatValue(1234, "count")).toBe("1,234");
    expect(formatValue(250000, "count")).toBe("250K");
    expect(formatValue(7.25, "per_sq_mi")).toBe("7.3/sq mi");
    expect(formatValue(3400, "per_sq_mi")).toBe("3,400/sq mi");
    expect(formatValue(1, "agreements")).toBe("1 agreement");
    expect(formatValue(12, "declarations")).toBe("12 declarations");
    expect(formatValue(3, "categories")).toBe("3 categories");
    expect(formatValue(42, "percentile")).toBe("42nd percentile");
    expect(formatValue(11, "percentile")).toBe("11th percentile");
    expect(formatValue(71.5, "deg_f")).toBe("71.5°F");
    expect(formatValue(9, "ug_m3")).toBe("9.0 µg/m³");
    expect(formatValue(0.07, "ppm")).toBe("0.070 ppm");
    expect(formatValue(4512.4, "degree_days")).toBe("4,512 degree days");
  });
  it("says No data for missing values", () => {
    expect(formatValue(null, "dollars")).toBe("No data");
    expect(formatValue(undefined, "percent")).toBe("No data");
    expect(formatValue(NaN, "count")).toBe("No data");
  });
});

describe("classLabels", () => {
  it("labels open-ended ranges", () => {
    expect(classLabels([10, 20], "percent")).toEqual(["< 10%", "10% – 20%", "≥ 20%"]);
  });
  it("drops a repeated multi-character unit from the lower bound", () => {
    expect(classLabels([10.9, 15.9, 20], "per_100k")).toEqual(["< 10.9 per 100k", "10.9 – 15.9 per 100k", "15.9 – 20 per 100k", "≥ 20 per 100k"]);
  });
  it("uses exact inclusive ranges for whole-number counts", () => {
    expect(classLabels([1, 2, 4, 8], "agreements")).toEqual(["0 agreements", "1 agreement", "2–3 agreements", "4–7 agreements", "8 or more agreements"]);
  });
  it("labels a bottom class that holds only the minimum", () => {
    expect(classLabels([0.5, 2, 5], "percent", { min: 0, minIsClass: true })).toEqual(["0%", "> 0% – 2%", "2% – 5%", "≥ 5%"]);
  });
  it("has one label when there are no breaks", () => {
    expect(classLabels([], "dollars")).toEqual(["All values"]);
  });
});

describe("formatEstimate", () => {
  const e = (v: number, m: number | null, u: Parameters<typeof formatValue>[1]) => { const r = formatEstimate(v, m, u); return r.moe ? `${r.value} ±${r.moe}` : r.value; };
  it("keeps margins no finer than values", () => {
    expect(e(0.5043, 0.0027, "ratio")).toBe("0.504 ±0.003");
    expect(e(1435, 7, "dollars")).toBe("$1,435 ±$7");
    expect(e(19.8, 1.9, "percent")).toBe("19.8% ±1.9%");
    expect(e(7, 0.16, "percent")).toBe("7% ±0.2%");
    expect(e(0.4, 0.004, "percent")).toBe("0.4% ±0.01%");
  });
  it("never prints a zero margin", () => {
    expect(e(50, 0, "percent")).toBe("50%");
    expect(e(3000, 0, "per_sq_mi")).toBe("3,000/sq mi");
    expect(e(0.5, 0.0001, "ratio")).toBe("0.5 ±0.001");
    expect(e(1000, null, "count")).toBe("1,000");
    expect(e(123902, 4816, "count")).toBe("123,902 ±4,816");
    expect(e(850, 40, "count")).toBe("850 ±40");
    expect(e(123902, null, "count")).toBe("123.9K");
  });
  it("handles tiny dollars and top percentiles", () => {
    expect(e(0.007, 0.002, "dollars")).toBe("less than 1¢");
    expect(formatValue(0.007, "dollars")).toBe("less than 1¢");
    expect(formatValue(0.5043, "ratio")).toBe("0.504");
    expect(formatValue(99.97, "percentile")).toBe("top 1%");
    expect(formatValue(98.5, "percentile")).toBe("top 1%");
    expect(formatValue(98.4, "percentile")).toBe("98th percentile");
    expect(formatValue(0.2, "percentile")).toBe("1st percentile");
    expect(classLabels([0.418, 0.4523], "ratio")).toEqual(["< 0.42", "0.42 – 0.45", "≥ 0.45"]);
    expect(classLabels([0.007, 0.5], "dollars")[0]).toBe("< $0.01");
  });
});
