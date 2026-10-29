import { describe, expect, it } from "vitest";
import { droppedDatasets, isCountFile, isTractFile, mergeShard, SHARD_PREFIXES } from "./publish-tiles.ts";

describe("droppedDatasets", () => {
  it("lists live datasets missing from the new shard", () => {
    expect(droppedDatasets({ pct_poverty: {}, diabetes: {} }, { diabetes: {} })).toEqual(["pct_poverty"]);
  });
  it("allows additions and replacements", () => {
    expect(droppedDatasets({ pct_poverty: {} }, { pct_poverty: {}, diabetes: {} })).toEqual([]);
  });
});

describe("isCountFile", () => {
  it("matches only the files `ingest counts` writes", () => {
    for (const f of ["pct_poverty/county.moe.json", "pct_poverty/2019/tract.moe.json", "pct_poverty/state.counts.json", "pct_poverty/us.json", "pct_poverty/2014/us.json", "counts/tract/27053.json", "counts/block_group/27053.json"])
      expect(isCountFile(f), f).toBe(true);
    for (const f of ["pct_poverty/county.json", "pct_poverty/block_group.moe.json", "pct_poverty/2019/tract.json", "tracts/27053.json", "pct_poverty/tract.counts.json"])
      expect(isCountFile(f), f).toBe(false);
  });
  it("covers the count shards with the drop guard", () => {
    expect(SHARD_PREFIXES).toEqual(["values/tracts/", "values/counts/"]);
  });
});

describe("isTractFile (D-506)", () => {
  it("matches one map's per-county tract file, which the drop guard checks for lost tracts", () => {
    expect(isTractFile("values/pct_poverty/tracts/27053.json")).toBe(true);
    for (const k of ["values/tracts/27053.json", "values/pct_poverty/tract.json", "values/counts/tract/27053.json", "values/pct_poverty/2019/tract.json"])
      expect(isTractFile(k), k).toBe(false);
    // The guard's test for one tract file: live tracts missing from the new one.
    expect(droppedDatasets({ "026100": [1, 0], "026200": [2, 0] }, { "026100": [1, 0] })).toEqual(["026200"]);
  });
});

describe("mergeShard", () => {
  const reloaded = new Set(["pct_poverty"]);
  it("swaps in the reloaded dataset and keeps every other live one, keys sorted", () => {
    const m = mergeShard({ pct_poverty: { "000100": [1] }, diabetes: { "000100": [2] } }, { pct_poverty: { "000100": [3] } }, reloaded);
    expect(m.next).toEqual({ diabetes: { "000100": [2] }, pct_poverty: { "000100": [3] } });
    expect(Object.keys(m.next)).toEqual(["diabetes", "pct_poverty"]);
    expect(m.dropped).toEqual([]);
  });
  it("adds a county the live site doesn't have yet", () => {
    expect(mergeShard({}, { pct_poverty: {} }, reloaded)).toEqual({ next: { pct_poverty: {} }, dropped: [] });
  });
  it("reports a reloaded dataset that vanished from a county, keeping the rest", () => {
    expect(mergeShard({ pct_poverty: {}, diabetes: {} }, {}, reloaded)).toEqual({ next: { diabetes: {} }, dropped: ["pct_poverty"] });
  });
});
