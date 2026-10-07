import { describe, expect, it } from "vitest";
import { reliabilityNote, unreliableIn, unreliableTracts } from "./reliability";

describe("unreliableTracts", () => {
  const shard = {
    pct_poverty: {
      "100200": [10, 2] as [number, number], // CV 12%: reliable
      "100300": [10, 4] as [number, number], // CV 24%: caution
      "100400": [5, 4] as [number, number], // CV 49%: unreliable
      "100500": [0, 3] as [number, number], // zero: not graded
      "100600": [8, null] as [number, null], // no margin: not graded
    },
  };
  it("returns full geoids of unreliable tracts only", () => {
    expect(unreliableTracts(shard, "pct_poverty", "27053")).toEqual(["27053100400"]);
  });
  it("is empty for a missing shard or dataset", () => {
    expect(unreliableTracts(null, "pct_poverty", "27053")).toEqual([]);
    expect(unreliableTracts(shard, "median_age", "27053")).toEqual([]);
  });
});

describe("unreliableIn", () => {
  it("joins values and margins by geoid", () => {
    expect(unreliableIn({ a: 100, b: 100, c: 100 }, { a: 10, b: 60 })).toEqual(["b"]);
  });
});

describe("reliabilityNote", () => {
  it("has a note for caution and unreliable only", () => {
    expect(reliabilityNote("reliable")).toBeNull();
    expect(reliabilityNote(null)).toBeNull();
    expect(reliabilityNote("caution")?.title).toBe("Use with caution");
    expect(reliabilityNote("unreliable")?.title).toBe("Unreliable estimate");
  });
});
