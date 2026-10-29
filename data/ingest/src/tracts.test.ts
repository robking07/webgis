import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { splitShard } from "./tracts.ts";
import { tractFile, writeTractValues } from "./values.ts";

const read = (f: string) => JSON.parse(readFileSync(f, "utf8"));

describe("writeTractValues (D-506)", () => {
  it("writes one file per county in the map's own folder and touches no other map", () => {
    const root = mkdtempSync(join(tmpdir(), "tracts-"));
    const other = tractFile("diabetes", "27053", root);
    mkdirSync(join(root, "values", "diabetes", "tracts"), { recursive: true });
    writeFileSync(other, '{"026100":[9,1]}');
    writeTractValues("pct_poverty", new Map([
      ["27053026100", { value: 12.345678, moe: 1.23456 }],
      ["27123000100", { value: null, moe: null }],
    ]), root);
    expect(read(tractFile("pct_poverty", "27053", root))).toEqual({ "026100": [12.35, 1.23] });
    expect(read(tractFile("pct_poverty", "27123", root))).toEqual({ "000100": [null, null] });
    expect(read(join(root, "values", "pct_poverty", "tract.json"))).toEqual({ "27053026100": 12.35 });
    expect(readFileSync(other, "utf8")).toBe('{"026100":[9,1]}');
    expect(readdirSync(join(root, "values"))).not.toContain("tracts");
  });
  it("drops counties a reload no longer has from data/tiles", () => {
    const root = mkdtempSync(join(tmpdir(), "tracts-"));
    writeTractValues("pct_poverty", new Map([["27053026100", { value: 1, moe: 0 }], ["27123000100", { value: 2, moe: 0 }]]), root);
    writeTractValues("pct_poverty", new Map([["27053026100", { value: 3, moe: 0 }]]), root);
    expect(readdirSync(join(root, "values", "pct_poverty", "tracts"))).toEqual(["27053.json"]);
  });
});

describe("splitShard", () => {
  it("writes each map's rows of an all-maps county file to its own file", () => {
    const root = mkdtempSync(join(tmpdir(), "tracts-"));
    splitShard({ diabetes: { "026100": [9, 1] }, pct_poverty: { "026100": [3, null], "026200": [4, 1] } }, "27053", root);
    expect(read(tractFile("diabetes", "27053", root))).toEqual({ "026100": [9, 1] });
    expect(read(tractFile("pct_poverty", "27053", root))).toEqual({ "026100": [3, null], "026200": [4, 1] });
  });
});
