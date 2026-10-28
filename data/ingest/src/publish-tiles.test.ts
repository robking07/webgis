import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { droppedDatasets, isCountFile, pullTracts, SHARD_PREFIXES } from "./publish-tiles.ts";

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

describe("pullTracts", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  const stub = (byCounty: Record<string, number>) => vi.stubGlobal("fetch", async (url: string) => {
    const c = url.match(/tracts\/(\d{5})\.json/)![1];
    return new Response(byCounty[c] === 200 ? '{"pct_poverty":{}}' : "x", { status: byCounty[c] });
  });

  it("copies live shards and skips counties without one", async () => {
    stub({ "27053": 200, "27123": 404 });
    const dir = mkdtempSync(join(tmpdir(), "pull-"));
    await pullTracts("https://h", dir, ["27053", "27123"]);
    expect(JSON.parse(readFileSync(join(dir, "27053.json"), "utf8"))).toEqual({ pct_poverty: {} });
    expect(existsSync(join(dir, "27123.json"))).toBe(false);
  });

  it("stops on a server error instead of leaving a partial set", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    stub({ "27053": 500 });
    const run = expect(pullTracts("https://h", mkdtempSync(join(tmpdir(), "pull-")), ["27053"])).rejects.toThrow("→ 500");
    await vi.runAllTimersAsync();
    await run;
  });
});
