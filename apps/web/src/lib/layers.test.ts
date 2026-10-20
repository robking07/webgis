import { describe, expect, it } from "vitest";
import { pairReason } from "./layers";
import type { Dataset } from "./registry";

const ds = (id: string, kind: string, geographyLevels: string[]) => ({ id, measure: { kind }, geographyLevels }) as unknown as Dataset;
const tracts = ds("asthma", "places", ["county", "tract"]);

describe("pairReason", () => {
  it("pairs area maps with a level in common", () => expect(pairReason(tracts, ds("arthritis", "places", ["tract"]))).toBeNull());
  it("refuses the same map twice", () => expect(pairReason(tracts, tracts)).toMatch(/Already on the map/));
  it("refuses roads and sites", () => expect(pairReason(tracts, ds("aadt", "features", ["county"]))).toMatch(/Roads/));
  it("refuses maps with no level in common; blocks don't count", () => {
    expect(pairReason(tracts, ds("x", "acs5", ["state"]))).toMatch(/same kinds of area/);
    expect(pairReason(ds("a", "census2020", ["block"]), ds("b", "census2020", ["block"]))).toMatch(/same kinds of area/);
  });
});
