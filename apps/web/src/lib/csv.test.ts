import { describe, expect, it } from "vitest";
import { buildCsv, csvFile, placeCsv } from "./csv";
import type { Dataset } from "./registry";

const ds = (kind: string) => ({ id: "x", unit: "count", vintage: "2023", license: "PD", measure: { kind }, source: { name: "S", citation: "C" } }) as unknown as Dataset;
const names = { "27053": "Hennepin County" };

describe("CSV margin column", () => {
  it("is written, in plain words, when margins exist", async () => {
    const { blob, rows } = await csvFile(ds("acs5"), ["27053"], { "27053": 5 }, { "27053": 1.5 }, names);
    const t = await blob.text();
    expect(rows).toBe(1);
    expect(t).toContain("geoid,name,value,margin of error (±),unit");
    expect(t).toContain("27053,Hennepin County,5,1.5,count");
  });
  it("is absent when there are none", async () => {
    const t = await (await csvFile(ds("acs5"), ["27053"], { "27053": 5 }, {}, names)).blob.text();
    expect(t).toContain("geoid,name,value,unit");
    expect(t).not.toContain("margin");
  });
  it("buildCsv asks for margins only for survey datasets", async () => {
    const load = async () => ({ "27053": 5 });
    const moe = async () => ({ "27053": 2 });
    expect(await (await buildCsv(ds("acs5"), "county", load, names, moe)).blob.text()).toContain("margin of error");
    expect(await (await buildCsv(ds("cdc"), "county", load, names, moe)).blob.text()).not.toContain("margin");
  });
});

const d = { title: "Poverty, below line", unit: "%", vintage: "ACS 2019–2023", source: { name: "U.S. Census Bureau", citation: 'ACS "5-year"' } } as Dataset;

describe("placeCsv", () => {
  it("writes value, margin and source per row, quoting fields, with the place noted at the end", async () => {
    const text = await placeCsv("27053", "Hennepin County, MN", [{ d, value: 9.6, moe: 0.4 }, { d, value: null, moe: null }]).text();
    const lines = text.replace("﻿", "").split("\r\n");
    expect(lines[0]).toBe("dataset,value,margin of error (±),unit,period,source,citation");
    expect(lines[1]).toBe('"Poverty, below line",9.6,0.4,%,ACS 2019–2023,U.S. Census Bureau,"ACS ""5-year"""');
    expect(lines[2]).toBe('"Poverty, below line",,,%,ACS 2019–2023,U.S. Census Bureau,"ACS ""5-year"""');
    expect(text).toContain('"# Place: Hennepin County, MN"');
  });
});
