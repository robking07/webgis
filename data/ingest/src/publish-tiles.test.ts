import { describe, expect, it } from "vitest";
import { droppedDatasets, isCountFile, mergeShard, SHARD_PREFIXES } from "./publish-tiles.ts";

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
