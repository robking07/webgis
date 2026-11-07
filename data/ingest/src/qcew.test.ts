import { describe, expect, it } from "vitest";
import { parseQcew, qcewValues } from "./qcew.ts";

describe("QCEW", () => {
  // Shape of the real "10 Total, all industries" file (trimmed columns; titles hold quoted commas).
  const head = '"area_fips","own_code","industry_code","agglvl_code","size_code","year","qtr","disclosure_code","area_title","annual_avg_emplvl","total_annual_wages","avg_annual_pay"';
  const row = (a: string, own: string, lvl: string, d: string, jobs: number, wages: number) =>
    `"${a}","${own}","10","${lvl}","0","2024","A","${d}","Somewhere, State",${jobs},${wages},0`;
  const text = [head,
    row("27000", "0", "50", "", 2932411, 217647000000),
    row("27053", "0", "70", "", 917117, 82684587070), // BLS 2024: avg annual pay $90,157
    row("27053", "5", "71", "", 800000, 70000000000), // private only: skipped
    row("42113", "0", "70", "N", 0, 0), // withheld
    row("27999", "0", "70", "", 1200, 60000000), // unknown county: state only
    row("12025", "0", "70", "", 10, 500000), // Dade → Miami-Dade
    row("51515", "0", "70", "N", 0, 0), row("51019", "0", "70", "", 100, 4000000), // a withheld part: unknown sum
    row("C3346", "0", "40", "", 1, 1), // metro area: skipped
    row("US000", "0", "10", "", 1, 1),
  ].join("\n");

  it("keeps state and county totals, all ownerships", () => {
    const q = parseQcew(text);
    expect([...q.keys()].sort()).toEqual(["12086", "27", "27053", "42113", "51019"]);
    expect(q.get("27053")).toEqual([917117, 82684587070]);
    expect(q.get("42113")).toBeNull();
    expect(q.get("51019")).toBeNull();
  });

  it("gives pay in 2024 dollars and jobs per 1,000; withheld is no data, never zero", () => {
    const q = parseQcew(text);
    const pay = qcewValues(q, "pay", 2024, null);
    expect(Math.round(pay.get("27053")!.value!)).toBe(90157);
    expect(pay.get("42113")!.value).toBeNull();
    expect(Math.round(qcewValues(q, "pay", 1990, null).get("27053")!.value! / 90157 * 1000) / 1000).toBe(2.4); // 313.689 / 130.7
    const rate = qcewValues(q, "per_1k", 2024, new Map([["27053", 1_277_000], ["42113", 6000]]));
    expect(rate.get("27053")!.value).toBeCloseTo(718.2, 1);
    expect(rate.get("42113")!.value).toBeNull();
    expect(rate.has("27")).toBe(false); // no residents given: left out
    expect(() => qcewValues(q, "pay", 1980, null)).toThrow(/CPI-U/);
  });
});
