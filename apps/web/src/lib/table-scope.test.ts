import { describe, expect, it } from "vitest";
import { tableScope } from "./table-scope";

const all = ["state", "county", "tract", "block_group"] as const;
describe("tableScope", () => {
  it("follows the map into tracts and block groups inside a focus", () => {
    expect(tableScope("tract", [...all], "27053")).toEqual({ level: "tract", within: "27053" });
    expect(tableScope("block_group", [...all], "27053")).toEqual({ level: "block_group", within: "27053" });
  });
  it("keeps counties for tracts with no focus (national zoom)", () => {
    expect(tableScope("tract", [...all], null)).toEqual({ level: "county", within: null });
  });
  it("lists only the focused state's counties", () => {
    expect(tableScope("county", [...all], "27")).toEqual({ level: "county", within: "27" });
    expect(tableScope("county", [...all], null)).toEqual({ level: "county", within: null });
  });
  it("has no table when there are no counties", () => {
    expect(tableScope("tract", ["tract"], null).level).toBeNull();
  });
});
