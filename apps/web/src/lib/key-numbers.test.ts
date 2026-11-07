import { describe, expect, it } from "vitest";
import { rankOrder, topThree } from "./key-numbers";
import { DATASET_BY_ID } from "./registry";

describe("rankOrder (#244)", () => {
  it("follows higherIsBetter, defaults to high, and never ranks race", () => {
    expect(rankOrder(DATASET_BY_ID.get("median_household_income")!)).toBe("high");
    expect(rankOrder(DATASET_BY_ID.get("unemployment_rate")!)).toBe("low");
    expect(rankOrder(DATASET_BY_ID.get("pct_poverty")!)).toBe("high"); // about groups of people
    expect(rankOrder(DATASET_BY_ID.get("pct_people_of_color")!)).toBeNull();
  });
});

describe("topThree", () => {
  const rows = [
    { name: "A", value: 10, moe: 1 }, { name: "B", value: 50, moe: 40 }, { name: "C", value: 30, moe: 1 },
    { name: "D", value: 20, moe: null }, { name: "E", value: 5, moe: 1 },
  ];
  it("lists the highest or lowest three", () => {
    expect(topThree(rows, "high", false).top.map((r) => r.name)).toEqual(["B", "C", "D"]);
    expect(topThree(rows, "low", false).top.map((r) => r.name)).toEqual(["E", "A", "D"]);
  });
  it("leaves out unreliable estimates and counts them (D-222)", () => {
    expect(topThree(rows, "high", true)).toEqual({ top: [rows[2], rows[3], rows[0]], skipped: 1 });
  });
});
