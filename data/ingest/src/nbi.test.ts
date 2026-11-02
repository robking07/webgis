import { describe, expect, it } from "vitest";
import { conditionAndArea } from "./nbi.ts";

const rec = (r: Record<string, string>) => (k: string) => r[k] ?? "";

describe("conditionAndArea (inventories before 2019)", () => {
  it("rates by the lowest of deck, superstructure, substructure and culvert, skipping N", () => {
    const b = { DECK_COND_058: "7", SUPERSTRUCTURE_COND_059: "4", SUBSTRUCTURE_COND_060: "6", CULVERT_COND_062: "N", STRUCTURE_LEN_MT_049: "20", DECK_WIDTH_MT_052: "10" };
    expect(conditionAndArea(rec(b))).toEqual(["P", 200]);
    expect(conditionAndArea(rec({ ...b, SUPERSTRUCTURE_COND_059: "5" }))[0]).toBe("F");
    expect(conditionAndArea(rec({ ...b, SUPERSTRUCTURE_COND_059: "8", SUBSTRUCTURE_COND_060: "7" }))[0]).toBe("G");
  });
  it("uses the approach roadway width for culverts (deck width 0), and no rating means no condition", () => {
    const c = { DECK_COND_058: "N", SUPERSTRUCTURE_COND_059: "N", SUBSTRUCTURE_COND_060: "N", CULVERT_COND_062: "5", STRUCTURE_LEN_MT_049: "6", DECK_WIDTH_MT_052: "0", APPR_WIDTH_MT_032: "8.5" };
    expect(conditionAndArea(rec(c))).toEqual(["F", 51]);
    expect(conditionAndArea(rec({ ...c, CULVERT_COND_062: "N" }))[0]).toBe("");
  });
});
