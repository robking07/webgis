import { describe, expect, it } from "vitest";
import { buildCsv, csvFile } from "./csv";
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
