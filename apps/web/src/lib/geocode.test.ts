import { describe, expect, it } from "vitest";
import { cleanAddress, firstMatch, looksLikeAddress } from "./geocode";

describe("geocode", () => {
  it("spots addresses, not ZIPs or names", () => {
    expect(looksLikeAddress("411 W 1st St, Duluth")).toBe(true);
    expect(looksLikeAddress("12-14 Main St")).toBe(true);
    expect(looksLikeAddress("55802")).toBe(false);
    expect(looksLikeAddress("Duluth")).toBe(false);
    expect(looksLikeAddress("3M")).toBe(false);
  });
  it("cleans input at the boundary", () => {
    expect(cleanAddress("  411  W 1st St ")).toBe("411 W 1st St");
    expect(cleanAddress("Apt #4, 12 O'Neil Rd")).toBe("Apt #4, 12 O'Neil Rd");
    expect(cleanAddress("1 a")).toBeNull();
    expect(cleanAddress("x".repeat(201))).toBeNull();
    expect(cleanAddress("1 Main <script>")).toBeNull();
    expect(cleanAddress(42)).toBeNull();
  });
  it("reads the first match", () => {
    const json = { result: { addressMatches: [{ matchedAddress: "411 W 1ST ST, DULUTH, MN, 55802", coordinates: { x: -92.1, y: 46.78 } }] } };
    expect(firstMatch(json)).toEqual({ address: "411 W 1ST ST, DULUTH, MN, 55802", lon: -92.1, lat: 46.78 });
    expect(firstMatch({ result: { addressMatches: [] } })).toBeNull();
    expect(firstMatch(null)).toBeNull();
  });
});

