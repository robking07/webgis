import { describe, expect, it } from "vitest";
import { declarationSets } from "./femadisasters.ts";

const CSV = [
  "disasterNumber,declarationType,declarationDate,tribalRequest,fipsStateCode,fipsCountyCode,designatedArea",
  "4000,DR,2011-08-01T00:00:00.000Z,0,27,053,Hennepin (County)",
  "4000,DR,2011-08-01T00:00:00.000Z,0,27,053,Hennepin (County)", // a second row for the same area
  "4001,DR,2012-01-01T00:00:00.000Z,0,27,053,Hennepin (County)",
  "4001,DR,2012-01-01T00:00:00.000Z,0,27,000,Statewide",
  "4002,DR,2013-01-01T00:00:00.000Z,0,27,000,Red Lake Indian Reservation",
  "4003,DR,2014-01-01T00:00:00.000Z,1,27,000,Red Lake Band of Chippewa Indians",
  "3500,EM,2015-01-01T00:00:00.000Z,0,27,053,Hennepin (County)",
  "1200,DR,1999-12-31T00:00:00.000Z,0,27,053,Hennepin (County)",
  "4004,DR,2015-01-01T00:00:00.000Z,0,46,113,\"Shannon (County), SD\"",
  "4005,DR,2016-01-01T00:00:00.000Z,0,02,261,Valdez-Cordova (Census Area)",
  "",
].join("\n");

describe("declarationSets", () => {
  const s = declarationSets(CSV, ["DR"], 2000);
  it("counts each declaration once per county, by type and start year", () => {
    expect(s.county.get("27053")?.size).toBe(2);
  });
  it("counts statewide and tribal-area rows toward the state only, and leaves tribal requests out", () => {
    expect([...s.state.get("27")!].sort()).toEqual(["4000", "4001", "4002"]);
    expect(s.county.has("27000")).toBe(false);
    expect(s.tribal).toBe(1);
  });
  it("renames and splits old county codes", () => {
    expect(s.county.get("46102")?.size).toBe(1);
    expect(s.county.get("02063")?.size).toBe(1);
    expect(s.county.get("02066")?.size).toBe(1);
    expect(s.county.has("02261")).toBe(false);
  });
  it("fails loudly on a missing column", () => {
    expect(() => declarationSets("a,b\n1,2", ["DR"], 2000)).toThrow(/missing/);
  });
});
