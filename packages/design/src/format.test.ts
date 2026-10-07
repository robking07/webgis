import { describe, expect, it } from "vitest";
import { classLabels, formatValue } from "./format.ts";

describe("formatValue", () => {
  it("formats by unit", () => {
    expect(formatValue(64450, "dollars")).toBe("$64,450");
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
    expect(formatValue(3, "categories")).toBe("3 categories");
    expect(formatValue(42, "percentile")).toBe("42nd percentile");
    expect(formatValue(11, "percentile")).toBe("11th percentile");
    expect(formatValue(71.5, "deg_f")).toBe("71.5°F");
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
