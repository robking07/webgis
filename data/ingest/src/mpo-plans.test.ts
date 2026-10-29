import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOG, classify } from "./mpo-plans.ts";

describe("classify", () => {
  it("counts a plain success as ok", () => {
    expect(classify(200)).toBe("ok");
    expect(classify(206)).toBe("ok");
  });
  it("counts only a clear 'gone' as dead", () => {
    expect(classify(404)).toBe("dead");
    expect(classify(410)).toBe("dead");
    expect(classify("ENOTFOUND")).toBe("dead");
  });
  it("never calls a blocked or flaky site dead", () => {
    for (const s of [202, 401, 403, 429, 500, 503, 999, "TimeoutError", "ECONNRESET"]) expect(classify(s)).toBe("cant-verify");
  });
});

describe("catalog", () => {
  const c = JSON.parse(readFileSync(CATALOG, "utf8"));
  const ids = new Set((JSON.parse(readFileSync(new URL("../../../apps/web/public/mpo/index.json", import.meta.url), "utf8")) as unknown[][]).map((r) => r[2]));
  it("uses the NTAD MPO ids the map knows", () => {
    for (const m of c.mpos) expect(ids.has(m.id), m.id).toBe(true);
  });
  it("has all four documents for every MPO", () => {
    for (const m of c.mpos) expect(Object.keys(m.docs).sort(), m.name).toEqual(Object.keys(c.labels).sort());
  });
});
