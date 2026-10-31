import { describe, expect, it } from "vitest";
import { checkLevel, loadRecipe, shape, toYaml } from "./library.ts";
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
  it("fails thin coverage, missing margins and values outside 0–100", () => {
    const none = { value: null, moe: null };
    expect(checkLevel("county", [ok(5), none, none, none]).reasons[0]).toMatch(/only 25% of areas have a value/);
    expect(checkLevel("county", [ok(5, null), ok(6, null), ok(7)]).reasons[0]).toMatch(/margin of error/);
    expect(checkLevel("state", [ok(5), ok(101)]).reasons[0]).toMatch(/outside 0–100/);
  });
});
