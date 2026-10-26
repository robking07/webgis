import { afterEach, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CACHE, cached } from "./util.ts";

afterEach(() => vi.unstubAllGlobals());

it("fails loudly on a bot challenge and caches nothing", async () => {
  vi.stubGlobal("fetch", async () => new Response("", { status: 202, headers: { "x-amzn-waf-action": "challenge" } }));
  await expect(cached("https://example.test/a.zip", "util-test-challenge.zip")).rejects.toThrow(/example\.test\/a\.zip.*202/);
  expect(existsSync(join(CACHE, "util-test-challenge.zip"))).toBe(false);
  expect(existsSync(join(CACHE, "util-test-challenge.zip.part"))).toBe(false);
});

it("rejects a 200 with an empty body and leaves no file", async () => {
  vi.stubGlobal("fetch", async () => new Response("", { status: 200 }));
  await expect(cached("https://example.test/b.zip", "util-test-empty.zip")).rejects.toThrow(/empty/);
  expect(existsSync(join(CACHE, "util-test-empty.zip"))).toBe(false);
  expect(existsSync(join(CACHE, "util-test-empty.zip.part"))).toBe(false);
});
