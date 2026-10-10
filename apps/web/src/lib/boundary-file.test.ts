import { describe, expect, it } from "vitest";
import { boundaryFile } from "@webgis/registry/timeline";

describe("boundaryFile", () => {
  it("uses the dated file only where one exists", () => {
    expect(boundaryFile("county", "2019")).toBe("county-2019");
    expect(boundaryFile("tract", "2019")).toBe("tract-2019");
    expect(boundaryFile("block_group", "2019")).toBe("block_group");
    expect(boundaryFile("block", "2019")).toBe("block");
    expect(boundaryFile("state", "2019")).toBe("state");
  });
  it("uses current files with no vintage", () => {
    expect(boundaryFile("tract", null)).toBe("tract");
    expect(boundaryFile("tract")).toBe("tract");
  });
});
