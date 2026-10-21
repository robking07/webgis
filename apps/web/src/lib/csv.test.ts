import { describe, expect, it } from "vitest";
import { placeCsv } from "./csv";
import type { Dataset } from "./registry";

const d = { title: "Poverty, below line", unit: "%", vintage: "ACS 2019–2023", source: { name: "U.S. Census Bureau", citation: 'ACS "5-year"' } } as Dataset;

describe("placeCsv", () => {
  it("writes value, ± and source per row, quoting fields, with the place noted at the end", async () => {
    const text = await placeCsv("27053", "Hennepin County, MN", [{ d, value: 9.6, moe: 0.4 }, { d, value: null, moe: null }]).text();
    const lines = text.replace("﻿", "").split("\r\n");
    expect(lines[0]).toBe("dataset,value,moe,unit,period,source,citation");
    expect(lines[1]).toBe('"Poverty, below line",9.6,0.4,%,ACS 2019–2023,U.S. Census Bureau,"ACS ""5-year"""');
    expect(lines[2]).toBe('"Poverty, below line",,,%,ACS 2019–2023,U.S. Census Bureau,"ACS ""5-year"""');
    expect(text).toContain('"# Place: Hennepin County, MN"');
  });
});
