import { describe, expect, it } from "vitest";
import { expression } from "@maplibre/maplibre-gl-style-spec";
import { childLevel, focusBands, levelAtZoom } from "./sizing.ts";
import { focusFilters } from "./style.ts";

// Drill-down (issue #203).
describe("childLevel", () => {
  it("is the next level the dataset has, null at its finest", () => {
    const all = ["state", "county", "tract", "block_group"] as const;
    expect(childLevel([...all], "state")).toBe("county");
    expect(childLevel([...all], "tract")).toBe("block_group");
    expect(childLevel([...all], "block_group")).toBeNull();
    expect(childLevel(["state", "tract"], "state")).toBe("tract");
    expect(childLevel(["county"], "county")).toBeNull();
    expect(childLevel(["county", "tract"], "state")).toBeNull();
  });
});

describe("focusBands", () => {
  it("draws the place's level and its children at every zoom, naming the children", () => {
    const b = focusBands("state", "county");
    expect(b).toEqual({ county: { minzoom: 0, maxzoom: 24 }, state: { minzoom: 0, maxzoom: 24 } });
    expect(levelAtZoom(b, 3)).toBe("county");
  });
  it("keeps block groups off national zooms (pinFloor)", () => {
    const b = focusBands("tract", "block_group", -1);
    expect(b.block_group).toEqual({ minzoom: 6, maxzoom: 24 });
    expect(levelAtZoom(b, 5)).toBe("tract");
    expect(levelAtZoom(b, 11)).toBe("block_group");
  });
});

describe("focusFilters", () => {
  const test = (filter: unknown, geoid: string) => {
    const e = expression.createExpression(filter, { type: "boolean" } as never);
    if (e.result !== "success") throw new Error(JSON.stringify(e.value));
    return e.value.evaluate({ zoom: 10 }, { type: 3, properties: { geoid }, geometry: [] } as never);
  };
  it("keeps only the places inside the parent", () => {
    const f = focusFilters("county", "48");
    expect(test(f["county-fill"], "48113")).toBe(true);
    expect(test(f["county-highlight"], "47113")).toBe(false);
    const t = focusFilters("tract", "48113");
    expect(test(t["tract-fill-48"], "48113010100")).toBe(true);
    expect(test(t["tract-fill-48"], "48114010100")).toBe(false);
    expect(test(t["tract-fill-27"], "48113010100")).toBe(false);
    expect(test(t["tract-fill-other"], "48113010100")).toBe(false);
    expect(test(focusFilters("block_group", "48113010100")["block_group-fill-48"], "481130101002")).toBe(true);
    // A prefix ending in 9 doesn't spill into the next one.
    expect(test(focusFilters("tract", "27059")["tract-fill-27"], "27060000100")).toBe(false);
  });
  it("puts each layer's own filter back when the focus clears", () => {
    const f = focusFilters("tract", null);
    expect(f["tract-fill"]).toBeNull();
    expect(test(f["tract-fill-48"], "48113010100")).toBe(true);
    expect(test(f["tract-fill-48"], "27053010100")).toBe(false);
    expect(test(f["tract-fill-other"], "99000000000")).toBe(true);
  });
});
