import { describe, expect, it } from "vitest";
import type { DatasetEntry } from "@webgis/registry";
import { by, combinations, confirm, context, fP, nEff, distanceClasses, type Data, type Pairs } from "./combinations.ts";
import { checks, pearson, ranks, withinStateRho } from "./insights.ts";

// Seeded normal noise, so the test is deterministic.
let seed = 7;
const unif = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const norm = () => Math.sqrt(-2 * Math.log(unif() + 1e-12)) * Math.cos(2 * Math.PI * unif());

// 51 states × 30 counties. y = a + b + c + noise (a known 3-companion set); d is a noisy copy of a
// (a decoy that adds nothing once a is in); e is unrelated.
const STATES = ["09", "23", "25", "33", "44", "50", "34", "36", "42", "17", "18", "26", "39", "55", "19", "20", "27", "29", "31", "38", "46",
  "10", "11", "12", "13", "24", "37", "45", "51", "54", "01", "21", "28", "47", "05", "22", "40", "48", "04", "08", "16", "30", "32", "35", "49", "56", "02", "06", "15", "41", "53"];
const geoids: string[] = [], lat: number[] = [], lon: number[] = [];
const cols: Record<string, number[]> = { y: [], a: [], b: [], c: [], d: [], e: [] };
STATES.forEach((s, si) => {
  const shift = norm();
  for (let i = 0; i < 30; i++) {
    geoids.push(`${s}${String(i + 1).padStart(3, "0")}`);
    lat.push(25 + (si % 10) * 2 + unif() * 2); lon.push(-120 + Math.floor(si / 10) * 10 + unif() * 3);
    const a = norm() + shift, b = norm(), c = norm();
    cols.a.push(a); cols.b.push(b); cols.c.push(c);
    cols.y.push(a + b + c + norm());
    cols.d.push(0.8 * a + 0.6 * norm()); cols.e.push(norm());
  }
});
const cats = { y: "Health", a: "People", b: "Economy", c: "Housing", d: "Transportation", e: "Environment and climate" } as const;
const entries = Object.entries(cats).map(([id, category]) => ({
  id, title: id, phrase: id, category, subcategory: "x", universe: id, modelInputs: [], measure: { kind: "acs5", numerator: [`V_${id}`] },
}) as unknown as DatasetEntry);
const data: Data = { geoids, lat, lon, values: new Map(Object.entries(cols).map(([k, v]) => [k, Float64Array.from(v)])) };
const pairs: Pairs = new Map();
for (const x of entries) for (const y of entries) if (x.id < y.id) {
  const xs = cols[x.id], ys = cols[y.id], r = pearson(xs, ys), rho = pearson(ranks(xs), ranks(ys)), w = withinStateRho(geoids, xs, ys);
  pairs.set(`${x.id}__${y.id}`, { rho, withinState: w, flags: checks(x, y, xs.length, r, rho, w) });
}
const ctx = context(data, entries, pairs);

describe("combinations", () => {
  it("finds the known set y ← a, b, c and nothing with the decoy or the noise", () => {
    const out = combinations(ctx).combinations;
    expect(out.some((x) => [x.focus, ...x.companions].sort().join() === "a,b,c,y")).toBe(true);
    expect(out.every((x) => ![x.focus, ...x.companions].some((m) => m === "d" || m === "e"))).toBe(true);
    const y = out.find((x) => x.focus === "y" || x.companions.includes("y"))!;
    expect(y.regions).toBeGreaterThanOrEqual(3);
    expect(y.caption).toMatch(/^Counties with higher .+ tend to have higher /);
  });
  it("fails the decoy trio y ← a, d on held-out states", () => {
    const decoy = confirm(ctx, "y", ["a", "d"], 1);
    expect(decoy.gain).toBeLessThan(0.02);
    expect(decoy.ok).toBe(false);
    expect(confirm(ctx, "y", ["a", "b", "c"], 1).ok).toBe(true);
  });
  it("effective n ≈ n for unrelated, unclustered noise", () => {
    const idx = geoids.map((_, i) => i), x = idx.map(norm), z = idx.map(norm);
    const ne = nEff(x, z, idx, distanceClasses(lat, lon, 10), geoids.length, 10);
    expect(ne).toBeGreaterThan(0.85 * idx.length);
  });
  it("F p-values and Benjamini–Yekutieli", () => {
    expect(fP(3.841, 1, 1e7)).toBeCloseTo(0.05, 3);
    expect(fP(1, 2, 20)).toBeCloseTo(0.385, 2);
    expect(by([0.001, 0.2, 0.004, 0.9], 0.05)).toEqual([true, false, true, false]);
  });
});
