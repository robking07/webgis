import { describe, expect, it } from "vitest";
import { changeEnds, type Stop } from "./periods";

const stop = (id: string, isDefault = false) => ({ id, label: id, isDefault, levels: [] }) as unknown as Stop;
// A climate map: years, and a normal as the default.
const stops = [stop("1991"), stop("2000"), stop("2010"), stop("2024"), stop("normal", true)];

describe("changeEnds", () => {
  it("runs from since to the year t", () => expect(changeEnds(stops, "2010", "1991")).toMatchObject({ from: { id: "1991" }, to: { id: "2010" } }));
  it("runs to the latest year when t is absent (old since= links) or the normal", () => {
    expect(changeEnds(stops, null, "2000")?.to.id).toBe("2024");
    expect(changeEnds(stops, "normal", "2000")?.to.id).toBe("2024");
  });
  it("falls back to the latest year when since isn't before t", () => expect(changeEnds(stops, "2000", "2010")).toMatchObject({ from: { id: "2010" }, to: { id: "2024" } }));
  it("is null without a valid since", () => {
    expect(changeEnds(stops, "2010", null)).toBeNull();
    expect(changeEnds(stops, null, "2024")).toBeNull();
  });
});
