import { describe, expect, it } from "vitest";
import { loadRegistry, loadRelations } from "@webgis/registry/load";
import { checkRelations, countsSpec, relationsExport, type Relations } from "@webgis/registry/relations";

const entries = loadRegistry();
const real = loadRelations(entries);
const copy = (): Relations => structuredClone(real);

describe("relations.yaml", () => {
  it("lists every registry map and passes its checks", () => {
    expect(Object.keys(real.maps).sort()).toEqual(entries.map((e) => e.id).sort());
    expect(checkRelations(real, entries)).toEqual([]);
  });
  it("fails when a registry map has no entry (the hook for new datasets)", () => {
    const r = copy();
    delete r.maps.pct_poverty;
    expect(checkRelations(r, entries)).toEqual(["pct_poverty: no entry in relations.yaml (add it under maps:)"]);
  });
  it("fails on a wrong group, missing or extra counts labels, and unknown maps", () => {
    const r = copy();
    r.maps.pct_poverty.group = "Housing";
    delete r.maps.pct_renter_households.counts;
    r.maps.diabetes.counts = { of: "people with diabetes", per: "adults" };
    r.maps.population_density.counts = { of: "residents", per: "square miles" };
    r.maps.no_such_map = { group: "Health" };
    const p = checkRelations(r, entries);
    expect(p).toContain('pct_poverty: group "Housing" must be the registry category "Economy"');
    expect(p.some((x) => x.startsWith("pct_renter_households: the ingest publishes counts"))).toBe(true);
    expect(p).toContain("diabetes: has counts labels but the ingest publishes no counts for it");
    expect(p).toContain("population_density: counts.per must be left out (no denominator)");
    expect(p).toContain("relations.yaml maps.no_such_map: no such registry dataset");
  });
  it("fails when parts don't share a denominator, overlap, or reuse a map id as remainder", () => {
    const r = copy();
    r.parts.race_ethnicity.members.push("pct_drive_alone");
    r.parts.commute_modes.remainder!.id = "pct_poverty";
    const p = checkRelations(r, entries);
    expect(p.some((x) => x.startsWith("parts.race_ethnicity: members must share one denominator"))).toBe(true);
    expect(p).toContain("parts.commute_modes: pct_drive_alone is already in parts.race_ethnicity");
    expect(p).toContain("parts.commute_modes: remainder id pct_poverty is taken");
  });
  it("fails on bad links", () => {
    const r = copy();
    r.links.push({ maps: ["median_household_income", "median_gross_rent"], why: "again" }, { maps: ["pct_poverty", "pct_poverty"], why: "self" }, { maps: ["pct_poverty", "nope"], why: "x" });
    const p = checkRelations(r, entries);
    expect(p).toContain("links median_household_income ↔ median_gross_rent: listed twice");
    expect(p).toContain("links pct_poverty ↔ pct_poverty: a map can't link to itself");
    expect(p).toContain("links pct_poverty ↔ nope: unknown map nope");
  });
  it("keeps people of color out of the race parts (it overlaps them) and PLACES maps without counts", () => {
    expect(real.parts.race_ethnicity.members).not.toContain("pct_people_of_color");
    expect(real.parts.race_ethnicity.members).toHaveLength(7);
    expect(real.parts.commute_modes.members).toHaveLength(6);
    expect(entries.filter((e) => e.measure.kind === "places").every((e) => countsSpec(e) == null)).toBe(true);
  });
  it("exports links both ways and each member's parts set", () => {
    const x = relationsExport(real);
    expect(x.maps.median_gross_rent.links.map((l) => l.id)).toContain("median_household_income");
    expect(x.maps.median_household_income.links.map((l) => l.id)).toContain("median_gross_rent");
    expect(x.maps.pct_carpool.parts).toBe("commute_modes");
    expect(x.maps.pct_people_of_color.parts).toBeUndefined();
  });
});
