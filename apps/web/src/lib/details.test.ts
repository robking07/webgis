import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detailFromShard, detailUrl, fetchDetail, fetchGeography, geographyFromShard, type DetailShard } from "./details";

const MN: DetailShard = {
  "27": { name: "Minnesota", lon: -94.3, lat: 46.2, aland_sqmi: 79631.562, values: { gini_index: [0.4525, 0.0019], census2020_pop_density: [71.67, null] } },
  "27053": { name: "Hennepin County, MN", lon: -93.5, lat: 45.0, aland_sqmi: 553.6, values: { gini_index: [0.48, 0.004] } },
};
const TRACTS = { gini_index: { "026100": [0.39, 0.05] }, median_age: { "026100": [34.1, 2.2], "000100": [40, 1] } };

describe("shard lookups", () => {
  it("returns every dataset's value and margin of error for a state or county", () => {
    expect(detailFromShard(MN, "27")).toEqual({
      gini_index: { value: 0.4525, moe: 0.0019 },
      census2020_pop_density: { value: 71.67, moe: null },
    });
    expect(detailFromShard(MN, "27053")).toEqual({ gini_index: { value: 0.48, moe: 0.004 } });
  });
  it("is empty for a place the file doesn't hold, or no file", () => {
    expect(detailFromShard(MN, "27999")).toEqual({});
    expect(detailFromShard(null, "27")).toEqual({});
  });
  it("builds the geography with its level from the geoid", () => {
    expect(geographyFromShard(MN, "27")).toEqual({ geoid: "27", level: "state", name: "Minnesota", lon: -94.3, lat: 46.2, aland_sqmi: 79631.562 });
    expect(geographyFromShard(MN, "27053")?.level).toBe("county");
    expect(geographyFromShard(MN, "06037")).toBeNull();
  });
  it("puts a county in its state's file", () => {
    expect(detailUrl("27053")).toMatch(/\/details\/27\.json$/);
    expect(detailUrl("27")).toBe(detailUrl("27053"));
  });
});

// The tiles base is "/tiles" locally and R2 in CI (NEXT_PUBLIC_TILES_BASE_URL).
const MN_URL = detailUrl("27"), PR_URL = detailUrl("72");

describe("fetchDetail / fetchGeography", () => {
  let calls: string[];
  beforeEach(() => {
    calls = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      if (url === MN_URL) return new Response(JSON.stringify(MN));
      if (url === "/data/values/tracts/27053.json") return new Response(JSON.stringify(TRACTS));
      if (url === PR_URL) return new Response("busy", { status: 503 });
      return new Response("not found", { status: 404 });
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads a state and its counties from one static file, fetched once", async () => {
    expect((await fetchDetail("27")).gini_index).toEqual({ value: 0.4525, moe: 0.0019 });
    expect((await fetchGeography("27053"))?.name).toBe("Hennepin County, MN");
    expect((await fetchDetail("27053")).gini_index).toEqual({ value: 0.48, moe: 0.004 });
    expect(calls).toEqual([MN_URL]);
  });
  it("never calls the database for states and counties", async () => {
    await fetchDetail("27053");
    await fetchGeography("27");
    expect(calls.every((u) => !u.includes("supabase"))).toBe(true);
  });
  it("reads a tract from its county's tract file", async () => {
    expect(await fetchDetail("27053026100")).toEqual({ gini_index: { value: 0.39, moe: 0.05 }, median_age: { value: 34.1, moe: 2.2 } });
    expect(calls).toEqual(["/data/values/tracts/27053.json"]);
  });
  it("treats a missing file as no data", async () => {
    expect(await fetchDetail("99")).toEqual({});
    expect(await fetchGeography("99001")).toBeNull();
  });
  it("throws on a server error and retries next time", async () => {
    await expect(fetchDetail("72")).rejects.toThrow("Place data couldn't be loaded (503)");
    await expect(fetchDetail("72")).rejects.toThrow();
    expect(calls).toEqual([PR_URL, PR_URL]);
  });
  it("has nothing for block groups or blocks (they read their own files)", async () => {
    expect(await fetchDetail("270530261001")).toEqual({});
    expect(calls).toEqual([]);
  });
});
