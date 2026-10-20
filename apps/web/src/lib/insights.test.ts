import { describe, expect, it } from "vitest";
import { browsePairings, CANDIDATES, isRegional, pairTitle, pickInteresting, strengthOf } from "./insights";
import { DATASET_BY_ID } from "./registry";

describe("front-page pick (issue #274)", () => {
  const pick = pickInteresting(CANDIDATES);
  it("picks six robust pairs, no dataset twice, deterministically", () => {
    expect(pick).toHaveLength(6);
    expect(pick.every((i) => strengthOf(i.rho) >= 2 && !isRegional(i))).toBe(true);
    const ids = pick.flatMap((i) => [i.x, i.y]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(pickInteresting([...CANDIDATES].reverse()).map((i) => i.id)).toEqual(pick.map((i) => i.id));
  });
  it("spreads across topics", () => {
    const cats = new Set(pick.flatMap((i) => [i.x, i.y].map((d) => DATASET_BY_ID.get(d)!.category)));
    expect(cats.size).toBeGreaterThanOrEqual(4);
  });
});

describe("browse filters", () => {
  it("returns everything by default, strongest first", () => {
    const all = browsePairings(CANDIDATES, {});
    expect(all).toHaveLength(CANDIDATES.length);
    expect(Math.abs(all[0].rho)).toBeGreaterThanOrEqual(Math.abs(all.at(-1)!.rho));
  });
  it("filters by topic, strength and title words", () => {
    const topic = DATASET_BY_ID.get(CANDIDATES[0].x)!.category;
    const t = browsePairings(CANDIDATES, { topic, strength: strengthOf(CANDIDATES[0].rho) });
    expect(t.length).toBeGreaterThan(0);
    expect(t.every((i) => strengthOf(i.rho) === strengthOf(CANDIDATES[0].rho) && [i.x, i.y].some((d) => DATASET_BY_ID.get(d)!.category === topic))).toBe(true);
    const word = DATASET_BY_ID.get(CANDIDATES[0].x)!.title.split(" ")[0].toUpperCase();
    const q = browsePairings(CANDIDATES, { q: word });
    expect(q.length).toBeGreaterThan(0);
    expect(q.every((i) => pairTitle(i).toLowerCase().includes(word.toLowerCase()))).toBe(true);
    expect(browsePairings(CANDIDATES, { q: "zzzz-no-such" })).toEqual([]);
  });
  it("sorts alphabetically by pair title", () => {
    const az = browsePairings(CANDIDATES, { sort: "az" }).map(pairTitle);
    expect(az).toEqual([...az].sort((a, b) => a.localeCompare(b)));
  });
});
