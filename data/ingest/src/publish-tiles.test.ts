import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";
import { droppedDatasets, isCountFile, isTractFile, mergeShard, publishJson, SHARD_PREFIXES, uploadProblems } from "./publish-tiles.ts";

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

const gz = (o: unknown) => gzipSync(JSON.stringify(o));

describe("uploadProblems (D-506)", () => {
  const live: Record<string, Record<string, unknown>> = {
    "values/pct_poverty/tracts/27053.json": { "026100": [1, 0], "026200": [2, 0] },
    "values/counts/tract/27053.json": { pct_poverty: {}, diabetes: {} },
  };
  const fetchLive = async (k: string) => live[k] ?? null;
  it("refuses a map's tract file that drops live tracts, and a shard that drops a dataset", async () => {
    const changed = [
      { key: "values/pct_poverty/tracts/27053.json", body: gz({ "026100": [1, 0] }) },
      { key: "values/counts/tract/27053.json", body: gz({ pct_poverty: {} }) },
    ];
    const p = await uploadProblems(changed, new Set(Object.keys(live)), new Set(changed.map((c) => c.key)), fetchLive);
    expect(p).toEqual([
      "values/counts/tract/27053.json: would drop 1 live dataset(s) (diabetes)",
      "values/pct_poverty/tracts/27053.json: would drop 1 live tract(s) (026200)",
    ]);
  });
  it("refuses a reloaded map missing a county R2 has, and ignores maps not in this upload", async () => {
    const liveKeys = new Set(["values/pct_poverty/tracts/27053.json", "values/pct_poverty/tracts/27123.json", "values/diabetes/tracts/27123.json"]);
    const local = new Set(["values/pct_poverty/tracts/27053.json"]);
    expect(await uploadProblems([], liveKeys, local, fetchLive)).toEqual(["values/pct_poverty/tracts/27123.json: on R2 but not in this load (stale county)"]);
  });
  it("refuses a state or county file with fewer places than the live one (#449)", async () => {
    const county = { "27053": 1, "27123": 2 };
    const fetch = async () => county;
    const keys = new Set(["values/pct_poverty/county.json"]);
    const short = [{ key: "values/pct_poverty/county.json", body: gz({ "27053": 1 }) }];
    expect(await uploadProblems(short, keys, keys, fetch)).toEqual(["values/pct_poverty/county.json: would cut 2 live places to 1"]);
    const same = [{ key: "values/pct_poverty/county.json", body: gz({ "27053": 1.5, "27123": 2 }) }];
    expect(await uploadProblems(same, keys, keys, fetch)).toEqual([]);
  });
  it("fetches nothing for files R2 doesn't have yet (the split's new files)", async () => {
    let fetched = 0;
    const changed = [{ key: "values/pct_poverty/tracts/01001.json", body: gz({}) }];
    expect(await uploadProblems(changed, new Set(), new Set(changed.map((c) => c.key)), async () => { fetched++; return null; })).toEqual([]);
    expect(fetched).toBe(0);
  });
});

describe("publishJson", () => {
  it("uploads nothing when any changed file fails the check", async () => {
    const tiles = mkdtempSync(join(tmpdir(), "publish-"));
    mkdirSync(join(tiles, "values", "pct_poverty", "tracts"), { recursive: true });
    writeFileSync(join(tiles, "values", "pct_poverty", "county.json"), '{"27053":1}');
    writeFileSync(join(tiles, "values", "pct_poverty", "tracts", "27053.json"), '{"026100":[1,0]}');
    const liveFile = gz({ "026100": [1, 0], "026200": [2, 0] });
    const puts: string[] = [];
    const send = async (cmd: unknown) => {
      if (cmd instanceof ListObjectsV2Command) return { Contents: [{ Key: "values/pct_poverty/tracts/27053.json", ETag: '"x"' }] };
      if (cmd instanceof GetObjectCommand) return { ContentEncoding: "gzip", Body: { transformToByteArray: async () => liveFile } };
      if (cmd instanceof PutObjectCommand) puts.push(cmd.input.Key!);
      return {};
    };
    await expect(publishJson("values", "export", undefined, undefined, { s3: { send } as never, bucket: "b" }, tiles)).rejects.toThrow(/nothing uploaded: 1 file/);
    expect(puts).toEqual([]);
  });
});
