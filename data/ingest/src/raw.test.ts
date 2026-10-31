import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { rawKey, saveRaw } from "./raw.ts";

describe("rawKey", () => {
  it("keeps a path that names its release, dates one that does not", () => {
    expect(rawKey("lead-2022/state.csv", "2026-10-31")).toBe("raw/lead-2022/state.csv");
    expect(rawKey("fema-nri-county.json", "2026-10-31")).toBe("raw/fema-nri-county.2026-10-31.json");
  });
});

describe("saveRaw", () => {
  it("skips a same-size key, never overwrites a different one, and skips scratch files", async () => {
    const root = mkdtempSync(join(tmpdir(), "raw-"));
    mkdirSync(join(root, "tippecanoe-tmp"));
    writeFileSync(join(root, "a-2024.csv"), "12345");
    writeFileSync(join(root, "b-2024.csv"), "xyz");
    writeFileSync(join(root, "c.csv"), "q");
    writeFileSync(join(root, "d-2024.csv.part"), "x");
    writeFileSync(join(root, "tippecanoe-tmp/t"), "x");
    const put: string[] = [];
    const live: Record<string, number> = { "raw/a-2024.csv": 5, "raw/b-2024.csv": 99 };
    const c = { head: async (k: string) => live[k] ?? null, put: async (k: string) => void put.push(k) };
    const files = ["a-2024.csv", "b-2024.csv", "c.csv", "d-2024.csv.part", "tippecanoe-tmp/t"].map((f) => join(root, f));
    expect(await saveRaw(files, root, "2026-10-31", c)).toEqual([2, 1]);
    expect(put).toEqual(["raw/b-2024.2026-10-31.csv", "raw/c.2026-10-31.csv"]);
  });
});
