import { afterEach, describe, expect, it, vi } from "vitest";
import { placeNameChecked } from "./place-name";

const COOK_TRACTS = { "101000": ["Tract 1010, Cook County, IL", -87.6, 41.9, 0.4] };
const mockShard = (status: number, body: unknown = {}) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
afterEach(() => vi.unstubAllGlobals());

describe("placeNameChecked", () => {
  it("names real states and counties, and DC's county without the state code", async () => {
    expect(await placeNameChecked("17031")).toBe("Cook County, IL");
    expect(await placeNameChecked("11001")).toBe("District of Columbia");
    expect(await placeNameChecked("17")).toBe("Illinois");
  });
  it("rejects retired counties, unknown territories and odd IDs", async () => {
    for (const id of ["09001", "99999", "78010", "60010", "1703", "17031abc", "170310101001"]) expect(await placeNameChecked(id)).toBeNull();
  });
  it("names a tract the county file holds, in the long form", async () => {
    mockShard(200, COOK_TRACTS);
    expect(await placeNameChecked("17031101000")).toBe("Census tract 1010, Cook County, IL");
  });
  it("rejects a tract the county file lacks, or a county with no file", async () => {
    mockShard(200, COOK_TRACTS);
    expect(await placeNameChecked("17031999999")).toBeNull();
    mockShard(404);
    expect(await placeNameChecked("09001000100")).toBeNull();
  });
  it("throws (so callers fail open) when the file can't be reached", async () => {
    mockShard(500);
    await expect(placeNameChecked("17031101000")).rejects.toThrow();
  });
});
