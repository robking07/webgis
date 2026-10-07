import { describe, expect, it } from "vitest";
import { expression, validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { hatchImage, hatchLayer, membershipFilter, NO_FEATURES } from "./style.ts";
import { HATCH } from "./themes.ts";

describe("membershipFilter", () => {
  const evalFor = (filter: unknown, geoid: string) => {
    const e = expression.createExpression(filter, { type: "boolean" } as never);
    if (e.result !== "success") throw new Error(JSON.stringify(e.value));
    return e.value.evaluate({ zoom: 10 }, { type: 3, properties: { geoid }, geometry: [] } as never);
  };
  it("matches exactly the listed geoids", () => {
    const f = membershipFilter(["27053100400", "27053100500", "06037101110"]);
    expect(evalFor(f, "27053100400")).toBe(true);
    expect(evalFor(f, "06037101110")).toBe(true);
    expect(evalFor(f, "27053100401")).toBe(false);
    expect(evalFor(f, "2705310040")).toBe(false);
    expect(evalFor(f, "27123100400")).toBe(false);
  });
  it("matches nothing when empty", () => {
    expect(membershipFilter([])).toBe(NO_FEATURES);
  });
});

describe("hatchLayer", () => {
  // An invalid layer is silently dropped by addLayer (MapView's error listener swallows the message),
  // so validate both the layer as created and with a filter set.
  const valid = (layer: object) => validateStyleMin({ version: 8, sources: { "b-tract": { type: "vector", url: "pmtiles://x" } }, layers: [layer] } as never);
  it("is a valid MapLibre layer as created (matching nothing)", () => {
    expect(valid(hatchLayer({ source: "b-tract", sourceLayer: "tract", level: "tract" }))).toEqual([]);
  });
  it("stays valid with a packed filter set", () => {
    expect(valid({ ...hatchLayer({ source: "b-tract", sourceLayer: "tract", level: "tract" }), filter: membershipFilter(["27053100400"]) })).toEqual([]);
  });
});

describe("hatchImage", () => {
  it("is a square of HATCH.spacing × pixel ratio, partly transparent", () => {
    for (const ratio of [1, 2]) {
      const img = hatchImage("light", ratio);
      expect(img.width).toBe(Math.round(HATCH.spacing * ratio));
      expect(img.data.length).toBe(img.width * img.height * 4);
      const alphas = Array.from({ length: img.width * img.height }, (_, i) => img.data[i * 4 + 3]);
      expect(Math.max(...alphas)).toBeLessThanOrEqual(Math.round(255 * HATCH.opacity.light));
      expect(alphas.some((a) => a === 0)).toBe(true);
      expect(alphas.some((a) => a > 0)).toBe(true);
    }
  });
});
