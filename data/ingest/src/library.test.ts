import { describe, expect, it } from "vitest";
import { checkLevel, loadRecipe, shape, shippedLevels, toYaml, type MapCheck } from "./library.ts";
import { derive } from "./acs.ts";

const recipe = loadRecipe();
const row = (cells: Record<string, number | null>) => ({ get: (v: string) => cells[v] });

describe("library recipe", () => {
  it("shapes every map into a valid Library entry with plain titles", () => {
    const ids = new Set<string>();
    for (const m of recipe.maps) {
      const { entry } = shape(m, recipe);
      expect(entry.library).toBe(true);
      expect(entry.title).not.toMatch(/\b(DP0\d|B\d{5})/); // no Census codes in titles
      expect(ids.has(entry.id)).toBe(false);
      ids.add(entry.id);
    }
  });

  it("reads a Data Profile percent and its margin as published; a detailed table as a share", () => {
    const wood = shape(recipe.maps.find((m) => m.id === "pct_heat_wood")!, recipe).entry;
    expect(derive(wood, row({ DP04_0068PE: 4.2, DP04_0068PM: 1.1 }))).toEqual({ value: 4.2, moe: 1.1 });
    const renters = shape(recipe.maps.find((m) => m.id === "pct_seniors_renting")!, recipe).entry;
    const cells: Record<string, number> = {};
    for (const v of ["009", "010", "011"]) { cells[`B25007_${v}E`] = 100; cells[`B25007_${v}M`] = 10; }
    for (const v of ["019", "020", "021"]) { cells[`B25007_${v}E`] = 50; cells[`B25007_${v}M`] = 10; }
    expect(derive(renters, row(cells)).value).toBeCloseTo(100 * 150 / 450);
  });

  it("reads a sum of rounded Census percents just over 100 as 100, and still fails a real overshoot (#373)", () => {
    const rent = shape(recipe.maps.find((m) => m.id === "pct_rent_2000_plus")!, recipe).entry;
    const v = (a: number, b: number, c: number) => derive(rent, row({ DP04_0131PE: a, DP04_0131PM: 1, DP04_0132PE: b, DP04_0132PM: 1, DP04_0133PE: c, DP04_0133PM: 1 })).value;
    expect(v(50.1, 30, 20)).toBe(100);
    expect(checkLevel("county", [{ value: v(50.1, 30, 20), moe: 1 }]).reasons).toEqual([]);
    expect(checkLevel("county", [{ value: v(60, 30, 20), moe: 1 }]).reasons).toHaveLength(1);
  });

  it("writes compact YAML", () => {
    const yaml = toYaml(shape(recipe.maps[0], recipe).raw);
    expect(yaml).toMatch(/^measure: \{kind: acs5, numerator: \[DP04_0007P\]\}$/m);
  });
});

describe("checkLevel", () => {
  const ok = (value: number, moe: number | null = 1) => ({ value, moe });
  it("passes a full, margined level and records the unreliable share", () => {
    const r = checkLevel("tract", [ok(10), ok(20), ok(1, 5), ok(0, 0)]);
    expect(r.reasons).toEqual([]);
    expect(r.stats.unreliable).toBeCloseTo(1 / 3); // 1 ± 5 is unreliable; 0 ± 0 is not graded (D-364)
  });
  it("ships a map with mostly unreliable tracts at state and county only, with a note (not a failure)", () => {
    const stats = (unreliable: number) => ({ areas: 10, coverage: 1, withMoe: 1, unreliable, min: 0, max: 50 });
    const shaky: MapCheck = { pass: true, reasons: [], levels: { county: stats(0.1), tract: stats(0.6) } };
    expect(shippedLevels(shaky)).toEqual(["state", "county"]);
    expect(shaky.pass).toBe(true);
    expect(shaky.notes?.[0]).toMatch(/60% of graded values are unreliable/);
    expect(shippedLevels({ pass: true, reasons: [], levels: { tract: stats(0.5) } })).toEqual(["state", "county", "tract"]);
    expect(shippedLevels(undefined)).toEqual(["state", "county", "tract"]); // offline: not checked yet
  });
  it("fails thin coverage, missing margins and values outside 0–100", () => {
    const none = { value: null, moe: null };
    expect(checkLevel("county", [ok(5), none, none, none]).reasons[0]).toMatch(/only 25% of areas have a value/);
    expect(checkLevel("county", [ok(5, null), ok(6, null), ok(7)]).reasons[0]).toMatch(/margin of error/);
    expect(checkLevel("state", [ok(5), ok(101)]).reasons[0]).toMatch(/outside 0–100/);
  });
});
