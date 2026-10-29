import { describe, expect, it } from "vitest";
import { memoCitation } from "./cite";
import { DATASET_BY_ID } from "./registry";

const income = DATASET_BY_ID.get("median_household_income")!;
const date = new Date(2026, 9, 28);

describe("memoCitation (issue #361)", () => {
  it("names map, place, period, source, link and access date on one line", () => {
    const s = memoCitation({ datasets: [income], place: "Cook County, IL", period: income.vintage, url: "https://mapwich.org/map?d=median_household_income", date });
    expect(s).toBe(`Median household income, Cook County, IL, 2020–2024 (5-year estimate). Source: ${income.source.citation}. Mapped by Mapwich, https://mapwich.org/map?d=median_household_income, accessed October 28, 2026.`);
    expect(s).not.toContain("\n");
  });
  it("leaves out a missing place and lists a shared source once", () => {
    const rent = DATASET_BY_ID.get("median_gross_rent")!;
    const s = memoCitation({ datasets: [income, rent], place: null, period: "2019 → 2024", url: "u", date });
    expect(s.startsWith(`${income.title} × ${rent.title}, 2019 → 2024. Source: `)).toBe(true);
    expect(s.split(income.source.citation).length).toBe(2);
  });
});
