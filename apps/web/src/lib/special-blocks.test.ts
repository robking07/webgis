// Unit tests for the Specials block parser (D-122): each block type, the numbers it computes, and the
// messages a mistake produces. No network: a tiny fake registry and fake county values.
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { DatasetEntry } from "@webgis/registry";
import { blockDatasets, blockWords, parseBlock, setBlockContext } from "./special-blocks.mts";

const appDir = fileURLToPath(new URL("../..", import.meta.url));

const ds = (id: string, unit: string, levels: string[], timeline = false) =>
  ({ id, title: `Title of ${id}`, unit, geographyLevels: levels, measure: { kind: "acs5" }, ...(timeline ? { timeline: { from: 2014, to: 2024, step: 5 } } : {}) }) as unknown as DatasetEntry;
const REGISTRY = [
  ds("wfh", "percent", ["state", "county", "tract"], true),
  ds("inactive", "percent", ["state", "county"]),
  ds("income", "dollars", ["state", "county", "tract"]),
  ds("no_county", "percent", ["state"]),
  ds("untiled", "percent", ["state", "county"]), // county values missing from the "export"
];
// Six real counties: Arlington, Loudoun, Fairfax, Albemarle, Grayson, Giles (VA).
const G = ["51013", "51107", "51059", "51003", "51071", "51035"];
const rec = (vals: number[]) => Object.fromEntries(G.map((g, i) => [g, vals[i]]));
const FILES: Record<string, unknown> = {
  "values/wfh/county.json": rec([35, 30, 28, 20, 5, 3]),
  "values/wfh/2019/county.json": rec([30, 25, 20, 15, 4, 2]),
  "values/inactive/county.json": rec([15, 16, 17, 20, 31, 25]),
  "values/income/county.json": rec([140000, 180000, 150000, 104000, 47000, 65000]),
};

beforeAll(() => setBlockContext({ byId: new Map(REGISTRY.map((d) => [d.id, d])), appDir, readData: (p) => FILES[p] ?? null }));

class Failed extends Error {}
const fail = (msg: string): never => { throw new Failed(msg); };
const inline = (md: string) => `<i>${md}</i>`;
const parse = (lang: string, yaml: string) => parseBlock(lang, yaml, fail, inline);
const message = (lang: string, yaml: string) => { try { parse(lang, yaml); } catch (e) { if (e instanceof Failed) return e.message; throw e; } return "(no error)"; };

describe("map block", () => {
  it("reads one or two datasets, the position, the level and an inline caption", () => {
    expect(parse("map", `datasets: [wfh, inactive]\nat: [-79.4, 37.9, 6.1]\ncaption: "Virginia, by *county*."`)).toEqual({
      kind: "map", datasets: ["wfh", "inactive"], at: { lon: -79.4, lat: 37.9, zoom: 6.1 }, level: "county", caption: "<i>Virginia, by *county*.</i>",
    });
  });
  it("allows a tract map of one dataset that has tracts", () => {
    expect(parse("map", `datasets: [income]\nat: [-93, 45, 9]\nlevel: tract\ncaption: x`)).toMatchObject({ level: "tract", datasets: ["income"] });
  });
  it.each([
    ["no datasets", `at: [-93, 45, 6]\ncaption: x`, `"datasets" must list one or two dataset ids`],
    ["three datasets", `datasets: [wfh, inactive, income]\nat: [-93, 45, 6]\ncaption: x`, `"datasets" must list one or two dataset ids`],
    ["unknown dataset", `datasets: [nope]\nat: [-93, 45, 6]\ncaption: x`, `unknown dataset "nope" (see data/registry/datasets/)`],
    ["no county values", `datasets: [no_county]\nat: [-93, 45, 6]\ncaption: x`, `"no_county" has no county values`],
    ["missing at", `datasets: [wfh]\ncaption: x`, `"at" must be [longitude, latitude, zoom]`],
    ["at with two numbers", `datasets: [wfh]\nat: [-93, 45]\ncaption: x`, `"at" must be [longitude, latitude, zoom]`],
    ["at as text", `datasets: [wfh]\nat: ["-93", "45", "6"]\ncaption: x`, `"at" must be [longitude, latitude, zoom]`],
    ["lat and lon swapped", `datasets: [wfh]\nat: [45, -93, 6]\ncaption: x`, `is outside the U.S.; it is [longitude, latitude, zoom] (longitude first, negative)`],
    ["zoom too far in", `datasets: [wfh]\nat: [-93, 45, 15]\ncaption: x`, `"at" zoom 15 must be between 2 and 14`],
    ["zoom too far out", `datasets: [wfh]\nat: [-93, 45, 1]\ncaption: x`, `"at" zoom 1 must be between 2 and 14`],
    ["bad level", `datasets: [wfh]\nat: [-93, 45, 6]\nlevel: state\ncaption: x`, `"level" must be county or tract`],
    ["tract map of two datasets", `datasets: [wfh, income]\nat: [-93, 45, 6]\nlevel: tract\ncaption: x`, `a tract map shows one dataset (a two-dataset map needs a level both share: county)`],
    ["tract map without tract data", `datasets: [inactive]\nat: [-93, 45, 6]\nlevel: tract\ncaption: x`, `"inactive" has no tract values`],
    ["missing caption", `datasets: [wfh]\nat: [-93, 45, 6]`, `"caption" is required`],
    ["unknown field", `datasets: [wfh]\nat: [-93, 45, 6]\ncaption: x\nzoomy: 1`, `unknown field "zoomy" (allowed: datasets, at, level, caption)`],
  ])("rejects %s", (_n, yaml, msg) => { expect(message("map", yaml)).toContain(msg); });
});

describe("chart block (bins)", () => {
  const chart = (extra = "") => parse("chart", `type: bins\ntitle: T\nx: wfh\ny: inactive\ngroups: 3\n${extra}`);
  it("cuts the counties into equal groups by x and averages y", () => {
    const c = chart("caption: note");
    expect(c).toMatchObject({ kind: "bins", title: "T", caption: "<i>note</i>", stat: "mean", n: 6 });
    if (c.kind !== "bins") throw new Error();
    // by wfh ascending: 3(25), 5(31), 20(20), 28(17), 30(16), 35(15)
    expect(c.rows).toEqual([
      { lo: 3, hi: 5, n: 2, value: 28 },
      { lo: 20, hi: 28, n: 2, value: 18.5 },
      { lo: 30, hi: 35, n: 2, value: 15.5 },
    ]);
  });
  it("can use the median, and a timeline stop on x", () => {
    const c = parse("chart", `type: bins\ntitle: T\nx: wfh@2019\ny: inactive\ngroups: 3\nstat: median`);
    if (c.kind !== "bins") throw new Error();
    expect(c.stat).toBe("median");
    expect(c.x).toMatchObject({ id: "wfh", stop: "2019", period: "2015–2019" });
    expect(c.rows[0]).toMatchObject({ lo: 2, hi: 4 });
  });
  it("treats the default stop as the dataset's headline values", () => {
    const c = parse("chart", `type: bins\ntitle: T\nx: wfh@2024\ny: inactive\ngroups: 3`);
    if (c.kind !== "bins") throw new Error();
    expect(c.x).toMatchObject({ stop: null, period: null });
  });
  it("defaults to deciles", () => {
    const c = parse("chart", `type: bins\ntitle: T\nx: wfh\ny: inactive`);
    if (c.kind !== "bins") throw new Error();
    expect(c.rows).toHaveLength(10);
  });
  it.each([
    ["wrong type", `type: lines\ntitle: T\nx: wfh\ny: inactive`, `chart "type" must be bins`],
    ["missing type", `title: T\nx: wfh\ny: inactive`, `"type" is required`],
    ["missing title", `type: bins\nx: wfh\ny: inactive`, `"title" is required`],
    ["too few groups", `type: bins\ntitle: T\nx: wfh\ny: inactive\ngroups: 2`, `"groups" must be a whole number from 3 to 20`],
    ["fractional groups", `type: bins\ntitle: T\nx: wfh\ny: inactive\ngroups: 4.5`, `"groups" must be a whole number from 3 to 20`],
    ["bad stat", `type: bins\ntitle: T\nx: wfh\ny: inactive\nstat: mode`, `"stat" must be mean or median`],
    ["x missing", `type: bins\ntitle: T\ny: inactive`, `"x" must be a dataset id`],
    ["unknown x", `type: bins\ntitle: T\nx: nope\ny: inactive`, `"x": unknown dataset "nope"`],
    ["x without county values", `type: bins\ntitle: T\nx: no_county\ny: inactive`, `"x": "no_county" has no county values`],
    ["unknown timeline stop", `type: bins\ntitle: T\nx: wfh@1999\ny: inactive`, `"x": "wfh" has no timeline stop "1999"`],
    ["stop on a dataset with no timeline", `type: bins\ntitle: T\nx: inactive@2019\ny: wfh`, `"x": "inactive" has no timeline stop "2019"`],
    ["no exported values", `type: bins\ntitle: T\nx: untiled\ny: inactive`, `"x": no exported county values for "untiled"`],
    ["unknown field", `type: bins\ntitle: T\nx: wfh\ny: inactive\nbars: 3`, `unknown field "bars"`],
  ])("rejects %s", (_n, yaml, msg) => { expect(message("chart", yaml)).toContain(msg); });
});

describe("table block", () => {
  it("counties: named counties with a column per dataset, in the order given", () => {
    const t = parse("table", `type: counties\ntitle: T\ncounties: ["51013", "51071"]\ncolumns: [wfh, income]\ncaption: c`);
    expect(t).toMatchObject({ kind: "counties", title: "T", caption: "<i>c</i>" });
    if (t.kind !== "counties") throw new Error();
    expect(t.rows).toEqual([
      { geoid: "51013", name: "Arlington County, VA", values: [35, 140000] },
      { geoid: "51071", name: "Giles County, VA", values: [5, 47000] },
    ]);
  });
  it("counties: pads an unquoted FIPS code that lost its leading zero", () => {
    const t = parse("table", `type: counties\ntitle: T\ncounties: [1001]\ncolumns: [wfh]`);
    if (t.kind !== "counties") throw new Error();
    expect(t.rows[0]).toMatchObject({ geoid: "01001", values: [null] }); // Autauga AL: not in the fake data
    expect(t.rows[0].name).toMatch(/Autauga/);
  });
  it("rank: top and bottom N by one dataset", () => {
    const top = parse("table", `type: rank\ntitle: T\nby: inactive\nn: 2\ncolumns: [wfh]`);
    const bottom = parse("table", `type: rank\ntitle: T\nby: inactive\norder: bottom\nn: 2\ncolumns: [wfh]`);
    if (top.kind !== "counties" || bottom.kind !== "counties") throw new Error();
    expect(top.rows.map((r) => r.geoid)).toEqual(["51071", "51035"]);
    expect(bottom.rows.map((r) => r.geoid)).toEqual(["51013", "51107"]);
  });
  it("correlations: Spearman rho, null on the diagonal", () => {
    const t = parse("table", `type: correlations\ntitle: T\nrows: [wfh, income]\nwith: [wfh, inactive]`);
    if (t.kind !== "correlations") throw new Error();
    expect(t.rows[0].cells[0]).toBeNull();
    expect(t.rows[0].cells[1]).toMatchObject({ n: 6 });
    // wfh ranks 6,5,4,3,2,1; inactive ranks 1,2,3,4,6,5 -> rho = 1 - 6*68/210
    expect(t.rows[0].cells[1]!.rho).toBeCloseTo(-0.9429, 3);
    expect(t.rows[1].cells[0]!.rho).toBeCloseTo(0.7714, 3);
  });
  it.each([
    ["missing type", `title: T\ncolumns: [wfh]`, `"type" is required`],
    ["unknown type", `type: pie\ntitle: T`, `table "type" must be correlations, counties or rank`],
    ["missing title", `type: counties\ncounties: ["51013"]\ncolumns: [wfh]`, `"title" is required`],
    ["no counties", `type: counties\ntitle: T\ncolumns: [wfh]`, `"counties" must list 1 to 25 county FIPS codes`],
    ["26 counties", `type: counties\ntitle: T\ncolumns: [wfh]\ncounties: [${Array.from({ length: 26 }, (_, i) => `"51013"`.replace("13", String(10 + i))).join(", ")}]`, `"counties" must list 1 to 25 county FIPS codes`],
    ["not a county", `type: counties\ntitle: T\ncounties: ["99999"]\ncolumns: [wfh]`, `"counties": "99999" is not a county FIPS code`],
    ["a state code", `type: counties\ntitle: T\ncounties: ["51"]\ncolumns: [wfh]`, `"counties": "00051" is not a county FIPS code`],
    ["five columns", `type: counties\ntitle: T\ncounties: ["51013"]\ncolumns: [wfh, inactive, income, wfh, inactive]`, `"columns" takes at most four datasets`],
    ["no columns", `type: counties\ntitle: T\ncounties: ["51013"]`, `"columns" must list at least one dataset id`],
    ["rank order", `type: rank\ntitle: T\nby: wfh\norder: middle\ncolumns: [wfh]`, `"order" must be top or bottom`],
    ["rank n too big", `type: rank\ntitle: T\nby: wfh\nn: 26\ncolumns: [wfh]`, `"n" must be a whole number from 1 to 25`],
    ["rank without by", `type: rank\ntitle: T\ncolumns: [wfh]`, `"by" must be a dataset id`],
    ["rank with counties field", `type: rank\ntitle: T\nby: wfh\ncounties: ["51013"]\ncolumns: [wfh]`, `unknown field "counties"`],
    ["four correlation columns", `type: correlations\ntitle: T\nrows: [wfh]\nwith: [wfh, inactive, income, wfh]`, `"with" takes at most three datasets`],
    ["correlations without rows", `type: correlations\ntitle: T\nwith: [wfh]`, `"rows" must list at least one dataset id`],
    ["correlations with unknown dataset", `type: correlations\ntitle: T\nrows: [nope]\nwith: [wfh]`, `"rows"[1]: unknown dataset "nope"`],
  ])("rejects %s", (_n, yaml, msg) => { expect(message("table", yaml)).toContain(msg); });
});

describe("malformed input", () => {
  it("reports YAML that can't be read", () => {
    expect(message("map", "datasets: [wfh\nat: [")).toMatch(/^can't read the YAML: /);
  });
  it("rejects YAML that isn't name: value fields", () => {
    expect(message("map", "- a\n- b")).toBe("the block must be YAML fields (name: value)");
    expect(message("map", "just some text")).toBe("the block must be YAML fields (name: value)");
  });
  it("treats an empty block as having no fields", () => {
    expect(message("map", "")).toContain(`"datasets" must list one or two dataset ids`);
    expect(message("chart", "")).toBe(`"title" is required`);
  });
  it("rejects non-text titles and captions", () => {
    expect(message("chart", "type: bins\ntitle: 5")).toBe(`"title" must be text`);
    expect(message("map", "datasets: [wfh]\nat: [-93, 45, 6]\ncaption: [a]")).toBe(`"caption" must be text`);
  });
  it("names an unknown block type", () => {
    expect(message("diagram", "title: T")).toBe(`"type" is required`); // the title check runs first
    expect(message("diagram", "title: T\ntype: x")).toBe(`unknown block type "diagram"`);
  });
});

describe("blockDatasets and blockWords", () => {
  it("lists the datasets each kind of block draws on", () => {
    expect(blockDatasets(parse("map", `datasets: [wfh, inactive]\nat: [-93, 45, 6]\ncaption: x`))).toEqual(["wfh", "inactive"]);
    expect(blockDatasets(parse("chart", `type: bins\ntitle: T\nx: wfh\ny: inactive`))).toEqual(["wfh", "inactive"]);
    expect(blockDatasets(parse("table", `type: correlations\ntitle: T\nrows: [income]\nwith: [wfh, inactive]`))).toEqual(["income", "wfh", "inactive"]);
    expect(blockDatasets(parse("table", `type: counties\ntitle: T\ncounties: ["51013"]\ncolumns: [wfh, income]`))).toEqual(["wfh", "income"]);
  });
  it("counts the words a reader reads: caption for a map, title and caption for the rest, tags stripped", () => {
    expect(blockWords(parse("map", `datasets: [wfh]\nat: [-93, 45, 6]\ncaption: one two three`))).toBe(3);
    expect(blockWords(parse("chart", `type: bins\ntitle: Two words\nx: wfh\ny: inactive\ncaption: and three more`))).toBe(5);
    expect(blockWords(parse("table", `type: counties\ntitle: Title\ncounties: ["51013"]\ncolumns: [wfh]`))).toBe(1);
  });
});
