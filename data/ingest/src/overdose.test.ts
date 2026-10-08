import { describe, expect, it } from "vitest";
import { overdoseRates, parseOverdoseRows } from "./overdose.ts";

describe("parseOverdoseRows", () => {
  it("pads FIPS, keeps true zeros, and nulls suppressed counties", () => {
    const r = parseOverdoseRows([
      { fips: "1001" }, // suppressed: no count
      { fips: "27053", provisional_drug_overdose: "353" },
      { fips: "56041", provisional_drug_overdose: "0" },
      { fips: "bad", provisional_drug_overdose: "5" },
    ]);
    expect(r.deaths.get("01001")).toBeNull();
    expect(r.deaths.get("27053")).toBe(353);
    expect(r.deaths.get("56041")).toBe(0);
    expect(r.deaths.size).toBe(3);
    expect(r.suppressed).toBe(1);
    expect(r.total).toBe(353);
  });
});

describe("overdoseRates", () => {
  it("rates per 100k; suppressed and unpopulated are null; unmatched codes dropped", () => {
    const deaths = new Map<string, number | null>([["27053", 353], ["01001", null], ["09001", 40], ["56041", 0], ["99999", 0]]);
    const pop = new Map([["27053", 1_270_000], ["01001", 60_000], ["56041", 20_000], ["02999", 0], ["72001", 1000]]);
    const out = overdoseRates(deaths, pop, 100000);
    expect(out.get("27053")!.value).toBeCloseTo(27.8, 1);
    expect(out.get("01001")!.value).toBeNull();
    expect(out.get("56041")!.value).toBe(0);
    expect(out.get("02999")!.value).toBeNull();
    expect(out.has("72001")).toBe(false);
    expect(out.has("09001")).toBe(false);
  });
});
