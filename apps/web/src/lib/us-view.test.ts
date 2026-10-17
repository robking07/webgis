import { describe, expect, it } from "vitest";
import { usInView } from "./us-view";

describe("usInView", () => {
  it("is true for the usual U.S. views", () => {
    expect(usInView({ lon: -98, lat: 39, zoom: 3.6 }, 1440, 900)).toBe(true);
    expect(usInView({ lon: -98, lat: 39, zoom: 2 }, 390, 844)).toBe(true);
    expect(usInView({ lon: -93.27, lat: 44.97, zoom: 12 }, 1440, 900)).toBe(true);
    expect(usInView({ lon: -157.8, lat: 21.3, zoom: 9 }, 390, 844)).toBe(true); // Honolulu
    expect(usInView({ lon: 179.5, lat: 60, zoom: 4 }, 1440, 900)).toBe(true); // Alaska across 180°
  });
  it("is false zoomed out to two worlds, or panned off the U.S.", () => {
    expect(usInView({ lon: -98, lat: 39, zoom: 1 }, 1440, 900)).toBe(false);
    expect(usInView({ lon: -98, lat: 39, zoom: 0.3 }, 390, 844)).toBe(false);
    expect(usInView({ lon: 10, lat: 50, zoom: 5 }, 1440, 900)).toBe(false); // Europe
    expect(usInView({ lon: -60, lat: -20, zoom: 4 }, 390, 844)).toBe(false); // South America
  });
});
