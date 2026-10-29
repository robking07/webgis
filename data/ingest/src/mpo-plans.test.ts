import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOG, classify, WEB_PLANS, webPlans } from "./mpo-plans.ts";

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
  it("matches the map's copy (run `npm run ingest -- export-mpo-plans` after an edit)", () => {
    expect(JSON.parse(readFileSync(WEB_PLANS, "utf8"))).toEqual(JSON.parse(JSON.stringify(webPlans(c))));
  });
  it("writes links in notes as [text](https://…), never a bare URL", () => {
    for (const n of JSON.stringify(c).match(/"note":"[^"]*"/g)!) expect(n.replace(/\[[^\]]+\]\(https:\/\/[^)\s]+\)/g, "")).not.toMatch(/https?:/);
  });
  it("links a kept copy only for documents publish uploads", () => {
    const kept = JSON.stringify(webPlans(c)).match(/"kept":"[^"]+"/g)!;
    expect(kept.length).toBeGreaterThan(0);
    for (const k of kept) expect(k).toMatch(/^"kept":"https:\/\/tiles\.mapwich\.org\/plans\/\d+\/[\w-]+\.(pdf|docx)"$/);
  });
});
