import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRetry, retryTile } from "./static-files";

afterEach(() => vi.unstubAllGlobals());

describe("fetchRetry (#380)", () => {
  it("retries once after a 503 and returns the second answer", async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response("", { status: 503 })).mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", f);
    expect((await fetchRetry("/x.json")).status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("retries once after a network error", async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(new Response("{}"));
    vi.stubGlobal("fetch", f);
    expect((await fetchRetry("/x.json")).status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("never retries a 404", async () => {
    const f = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    vi.stubGlobal("fetch", f);
    expect((await fetchRetry("/x.json")).status).toBe(404);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("gives up after one retry", async () => {
    const f = vi.fn().mockImplementation(async () => new Response("", { status: 520 }));
    vi.stubGlobal("fetch", f);
    expect((await fetchRetry("/x.json")).status).toBe(520);
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe("retryTile", () => {
  it("retries a PMTiles 5xx once, not a 404", async () => {
    const ok = vi.fn().mockRejectedValueOnce(new Error("Bad response code: 502")).mockResolvedValueOnce("tile");
    expect(await retryTile(ok)).toBe("tile");
    expect(ok).toHaveBeenCalledTimes(2);
    const gone = vi.fn().mockRejectedValue(new Error("Bad response code: 404"));
    await expect(retryTile(gone)).rejects.toThrow("404");
    expect(gone).toHaveBeenCalledTimes(1);
  });
});
