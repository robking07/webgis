// The values worker round trip (issue #28): the worker module runs in-process behind a fake Worker.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Values } from "./values";

const workerSelf: { onmessage?: (e: { data: unknown }) => void; postMessage?: (m: unknown) => void } = {};
const files: Record<string, Values> = {
  "http://localhost/tiles/values/median_age/block_group.json": { "270531001001": 30, "270531001002": 40, "270531001003": 50, "060750101001": 35, "060750101002": 45 },
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
  it("returns the values, with the same classification the main thread would make, pre-packed", async () => {
    const { loadValues, classifyUnivariate, classifyUnivariateCached } = await import("./values");
    const { DATASET_BY_ID } = await import("./registry");
    const v = await loadValues("median_age", "block_group");
    expect(v).toEqual(files["http://localhost/tiles/values/median_age/block_group.json"]);
    const ds = DATASET_BY_ID.get("median_age")!;
    const seeded = classifyUnivariateCached(ds, v);
    expect(seeded.packed?.size).toBe(2);
    const fresh = classifyUnivariate(ds, v);
    expect([...seeded.classes]).toEqual([...fresh.classes]);
    expect(seeded.breaks).toEqual(fresh.breaks);
    expect(seeded.colors).toEqual(fresh.colors);
  });
  it("a missing file rejects with the level and status", async () => {
    const { loadValues } = await import("./values");
    await expect(loadValues("nope", "block_group")).rejects.toThrow("No block_group data for nope (404)");
  });
});
