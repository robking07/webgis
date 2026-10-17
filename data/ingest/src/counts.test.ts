import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import { CACHE } from "./util.ts";
import { loadRegistry } from "@webgis/registry/load";
import { countsRow, PackedRow, remainderRow, sumStates, sumVars, usArea, writeCounts, type Counts } from "./counts.ts";
import { acsCounts, derive, remainders } from "./acs.ts";
import { census2020Counts } from "./census2020.ts";
import { farsCounts } from "./fars.ts";

const row = (o: Record<string, number | null>) => new Map(Object.entries(o));
const byId = new Map(loadRegistry().map((e) => [e.id, e]));
const reg = (id: string) => byId.get(id)!;

describe("sumVars", () => {
  it("adds estimates and combines margins as √Σ MOE²", () => {
    expect(sumVars(row({ A_001E: 30, A_001M: 3, A_002E: 10, A_002M: 4 }), ["A_001", "A_002"])).toEqual({ e: 40, m: 5 });
  });
  it("is null when any estimate is missing", () => {
    expect(sumVars(row({ A_001E: 30, A_001M: 3, A_002E: null }), ["A_001", "A_002"])).toEqual({ e: null, m: null });
  });
});

describe("PackedRow", () => {
  it("reads like the Map it replaces: numbers, null where missing, undefined where not fetched", () => {
    const index = new Map(["A_001E", "A_001M", "A_002E", "A_002M"].map((v, i) => [v, i]));
    const p = new PackedRow(index);
    p.set("A_001E", 30); p.set("A_001M", 3); p.set("A_002E", 0); p.set("A_002M", null);
    expect([p.get("A_001E"), p.get("A_002E"), p.get("A_002M"), p.get("B_001E")]).toEqual([30, 0, null, undefined]);
    expect(sumVars(p, ["A_001", "A_002"])).toEqual(sumVars(row({ A_001E: 30, A_001M: 3, A_002E: 0, A_002M: null }), ["A_001", "A_002"]));
    expect(sumVars(new PackedRow(index), ["A_001"])).toEqual({ e: null, m: null }); // never set = missing
  });
});

describe("acsCounts", () => {
  // Poverty: B17001_002 of B17001_001.
  const r = row({ B17001_002E: 120, B17001_002M: 30, B17001_001E: 1000, B17001_001M: 40 });
  it("gives the numerator and denominator behind a rate, and they reproduce the rate", () => {
    const c = acsCounts(reg("pct_poverty"), r)!;
    expect(c).toEqual([120, 30, 1000, 40]);
    expect((100 * c[0]!) / c[2]!).toBeCloseTo(derive(reg("pct_poverty"), r).value!);
  });
  it("uses the block-group tables at block groups", () => {
    const bg = row({ C17002_002E: 5, C17002_002M: 2, C17002_003E: 7, C17002_003M: 2, C17002_001E: 100, C17002_001M: 10 });
    const e = reg("pct_poverty");
    if (e.measure.kind !== "acs5" || !e.measure.blockGroup) throw new Error("pct_poverty lost its block-group tables");
    const vars = [...e.measure.blockGroup.numerator, ...(e.measure.blockGroup.denominator ?? [])];
    for (const v of vars) if (!bg.has(`${v}E`)) bg.set(`${v}E`, 0), bg.set(`${v}M`, 0);
    const c = acsCounts(e, bg, "block_group")!;
    expect(c[2]).toBe(sumVars(bg, e.measure.blockGroup.denominator!).e);
  });
  it("has a numerator only for densities and nothing for medians", () => {
    expect(acsCounts(reg("population_density"), row({ B01001_001E: 5000, B01001_001M: 0 }))).toEqual([5000, 0, null, null]);
    expect(acsCounts(reg("median_household_income"), row({ B19013_001E: 70000, B19013_001M: 900 }))).toBeNull();
  });
});

describe("remainder", () => {
  it("is the total minus the members, so the parts add up exactly", () => {
    const { row: r, mismatch } = remainderRow({ e: 100, m: 9 }, [{ e: 70, m: 5 }, { e: 25, m: 4 }], { e: 5, m: 3 });
    expect(r).toEqual([5, 3, 100, 9]);
    expect(mismatch).toBe(false);
  });
  it("flags cells that don't add up and never goes below zero", () => {
    expect(remainderRow({ e: 100, m: 9 }, [{ e: 90, m: 5 }], { e: 4, m: 3 }).mismatch).toBe(true);
    expect(remainderRow({ e: 10, m: 1 }, [{ e: 11, m: 1 }], { e: 0, m: 1 }).row[0]).toBe(0);
  });
  it("is unknown when a member is", () => {
    expect(remainderRow({ e: 100, m: 9 }, [{ e: null, m: null }], { e: 5, m: 3 }).row).toEqual([null, null, 100, 9]);
  });
  it("gives commute 'other' = taxi + motorcycle + other means for a real table row", () => {
    // B08301 for one place: total 1000; drove alone 700, carpool 90, transit 50, walk 30, bike 10,
    // home 100; taxi 8, motorcycle 2, other 10.
    const r = row({
      B08301_001E: 1000, B08301_001M: 50, B08301_003E: 700, B08301_003M: 40, B08301_004E: 90, B08301_004M: 20,
      B08301_010E: 50, B08301_010M: 15, B08301_019E: 30, B08301_019M: 10, B08301_018E: 10, B08301_018M: 6,
      B08301_021E: 100, B08301_021M: 25, B08301_016E: 8, B08301_016M: 3, B08301_017E: 2, B08301_017M: 4, B08301_020E: 10, B08301_020M: 12,
    });
    const members = ["pct_drive_alone", "pct_carpool", "pct_work_from_home", "pct_transit_commute", "pct_walk_commute", "pct_bike_commute"].map(reg);
    const total = members[0].measure.kind === "acs5" ? members[0].measure.denominator! : [];
    const c = remainders({ id: "other_commute_mode", variables: ["B08301_016", "B08301_017", "B08301_020"], members, total }, new Map([["27", r]])).get("27")!;
    expect(c).toEqual([20, 13, 1000, 50]); // MOE √(3² + 4² + 12²) = 13
    const shares = members.map((e) => derive(e, r).value!);
    expect(shares.reduce((a, b) => a + b, 0) + (100 * c[0]!) / c[2]!).toBeCloseTo(100);
  });
});

describe("U.S. row", () => {
  it("sums the states and DC, leaves out Puerto Rico and counties, and combines margins", () => {
    const rows = new Map<string, Counts>([["01", [10, 3, 100, null]], ["02", [20, 4, 200, null]], ["72", [999, 9, 999, null]], ["01001", [5, 1, 50, null]]]);
    expect(sumStates(rows)).toEqual([30, 5, 300, null]);
  });
  it("is unknown when a state is (a state missing from LODES)", () => {
    expect(sumStates(new Map<string, Counts>([["01", [10, null, null, null]], ["02", [null, null, null, null]]]))).toEqual([null, null, null, null]);
  });
  it("land area leaves out Puerto Rico", () => {
    expect(usArea(new Map([["01", 10], ["72", 3], ["02", 5]]))).toBe(15);
  });
  it("2020 Census and FARS counts reproduce their rates", () => {
    expect(census2020Counts("pct_vacant", { pop: 50, hu: 40, vac: 4, aland: 1 })).toEqual([4, null, 40, null]);
    expect(census2020Counts("pop_density", { pop: 50, hu: 40, vac: 4, aland: 1 })).toEqual([50, null, null, null]);
    const f = farsCounts(new Map([["27", { value: 6.5, moe: null }], ["28", { value: null, moe: null }]]), new Map([["27", 1857]]), new Map([["27", 5714300.4], ["28", 10]]), 5);
    expect(f.get("27")).toEqual([371.4, null, 5714300, null]);
    expect(f.get("28")).toEqual([null, null, 10, null]);
  });
  it("countsRow rounds counts and margins", () => {
    expect(countsRow({ e: 12.34, m: 2.6 }, { e: 100, m: null })).toEqual([12.3, 3, 100, null]);
  });
});

describe("writeCounts", () => {
  it("replaces only the series it writes in a county shard", () => {
    // Inside the repo (git-ignored data/cache), never the system temp folder.
    mkdirSync(CACHE, { recursive: true });
    const root = mkdtempSync(join(CACHE, "test-counts-"));
    onTestFinished(() => rmSync(root, { recursive: true, force: true }));
    const dir = join(root, "values", "counts", "tract");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "27053.json"), JSON.stringify({ job_density: { "000100": [5, null, null, null] }, pct_poverty: { "000100": [1, 1, 2, 1] } }));
    writeCounts("tract", new Map([["pct_poverty", new Map<string, Counts>([["27053000200", [3, 1, 9, 2]], ["27123000100", [4, 1, 8, 2]]])]]), root);
    expect(JSON.parse(readFileSync(join(dir, "27053.json"), "utf8"))).toEqual({ job_density: { "000100": [5, null, null, null] }, pct_poverty: { "000200": [3, 1, 9, 2] } });
    expect(JSON.parse(readFileSync(join(dir, "27123.json"), "utf8"))).toEqual({ pct_poverty: { "000100": [4, 1, 8, 2] } });
  });
});
