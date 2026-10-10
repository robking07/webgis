import { describe, expect, it } from "vitest";
import { droppedDatasets, isCountFile, SHARD_PREFIXES } from "./publish-tiles.ts";

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
