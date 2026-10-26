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
