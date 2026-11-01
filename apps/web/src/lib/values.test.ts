// The values worker round trip (issue #28): the worker module runs in-process behind a fake Worker.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Values } from "./values";
import { staticUrl } from "./static-files";

const workerSelf: { onmessage?: (e: { data: unknown }) => void; postMessage?: (m: unknown) => void } = {};
// Keyed by the URL the worker is asked for, whatever NEXT_PUBLIC_TILES_BASE_URL is (CI sets it).
const url = (path: string) => new URL(staticUrl(path), "http://localhost/map").href;
const bg: Values = { "270531001001": 30, "270531001002": 40, "270531001003": 50, "060750101001": 35, "060750101002": 45 };
const tracts: Values = { "27053100100": 20, "27053100200": 33, "27053100300": 38, "27053100400": 47, "06075010100": 60 };
const files: Record<string, Values> = {
  [url("values/median_age/tract.json")]: tracts,
  [url("values/empty/tract.json")]: {},
  [url("values/median_age/block_group.json")]: bg,
};

beforeAll(async () => {
  vi.stubGlobal("self", workerSelf);
  vi.stubGlobal("location", { href: "http://localhost/map" });
  vi.stubGlobal("fetch", async (url: string) => (files[url] ? new Response(JSON.stringify(files[url])) : new Response("", { status: 404 })));
  vi.stubGlobal("Worker", class {
    onmessage?: (e: { data: unknown }) => void;
    constructor() { workerSelf.postMessage = (m) => queueMicrotask(() => this.onmessage?.({ data: structuredClone(m) })); }
    postMessage(m: unknown) { workerSelf.onmessage!({ data: structuredClone(m) }); }
  });
  await import("./values.worker");
});
afterAll(() => vi.unstubAllGlobals());

describe("loadValues through the worker", () => {
  it("returns the values, classed with the tract breaks the main thread would use, pre-packed", async () => {
    const { loadValues, classifyUnivariate, classifyUnivariateCached } = await import("./values");
    const { DATASET_BY_ID } = await import("./registry");
    const v = await loadValues("median_age", "block_group");
    expect(v).toEqual(bg);
    const ds = DATASET_BY_ID.get("median_age")!;
    const t = await loadValues("median_age", "tract");
    // Block groups take the tract breaks (issue #325), cached under the tract values the map passes.
    const seeded = classifyUnivariateCached(ds, v, t);
    expect(seeded.packed?.size).toBe(2);
    expect(seeded.breaks).toEqual(classifyUnivariateCached(ds, t).breaks);
    const fresh = classifyUnivariate(ds, v, t);
    expect([...seeded.classes]).toEqual([...fresh.classes]);
    expect(seeded.breaks).toEqual(fresh.breaks);
    expect(seeded.colors).toEqual(fresh.colors);
  });
  it("an empty file gives no values", async () => {
    const { loadValues } = await import("./values");
    expect(await loadValues("empty", "tract")).toEqual({});
  });
  it("a missing file rejects with the level and status", async () => {
    const { loadValues } = await import("./values");
    await expect(loadValues("nope", "block_group")).rejects.toThrow("No block_group data for nope (404)");
  });
});

describe("breaks fitted to the counties in view (issue #439)", () => {
  // 40 rich tracts in county 53033, 40 poorer ones in 28001, 10 in 28003.
  const v: Values = {};
  for (let i = 0; i < 40; i++) v[`53033${String(i).padStart(6, "0")}`] = 100_000 + i * 5_000;
  for (let i = 0; i < 40; i++) v[`28001${String(i).padStart(6, "0")}`] = 20_000 + i * 1_000;
  for (let i = 0; i < 10; i++) v[`28003${String(i).padStart(6, "0")}`] = 30_000;

  it("classes every place with breaks from the viewed counties only", async () => {
    const { viewBreaks, classifyFittedCached, classifyUnivariateCached } = await import("./values");
    const ds = (await import("./registry")).DATASET_BY_ID.get("median_household_income")!;
    const us = classifyUnivariateCached(ds, v).breaks;
    const seattle = viewBreaks(ds, v, ["53033"])!;
    expect(seattle).not.toEqual(us);
    expect(seattle[0]).toBeGreaterThan(100_000);
    const c = classifyFittedCached(ds, v, seattle);
    expect(c.fitted).toBe(true);
    expect(c.breaks).toEqual(seattle);
    // The viewed county's tracts spread across all five classes.
    expect(new Set(Object.keys(v).filter((k) => k.startsWith("53033")).map((k) => c.classes.get(k))).size).toBe(5);
    // Same breaks again: the cached object, so the map doesn't repaint (D-114).
    expect(classifyFittedCached(ds, v, [...seattle])).toBe(c);
  });
  it("falls back to the U.S. breaks with fewer than 5 places per class in view, or no counties", async () => {
    const { viewBreaks } = await import("./values");
    const ds = (await import("./registry")).DATASET_BY_ID.get("median_household_income")!;
    expect(viewBreaks(ds, v, ["28003"])).toBeNull();
    expect(viewBreaks(ds, v, [])).toBeNull();
    expect(viewBreaks(ds, v, ["28001", "28003"])).not.toBeNull();
  });
});
