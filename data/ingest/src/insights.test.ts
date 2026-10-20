import { describe, expect, it } from "vitest";
import { loadRegistry } from "@webgis/registry/load";
import { reflag } from "./insights.ts";

const pair = (x: string, y: string) => ({ id: `${x}__${y}`, x, y, level: "county", n: 3000, r: 0.5, rho: 0.5, withinState: 0.4,
  status: "published", flags: [] as string[], headline: "h", caption: "c", captionBy: "template", fingerprint: "f" });

describe("insights --reflag", () => {
  it("flags a published pair built from its partner and leaves an unaffected pair unchanged", () => {
    const built = pair("pct_hispanic_latino", "svi_minority"), other = pair("pct_work_from_home", "physical_inactivity");
    const before = structuredClone(other);
    const out = reflag({ insights: [built, other] }, loadRegistry());
    expect(out.insights[0].status).toBe("flagged");
    expect(out.insights[0].flags[0]).toMatch(/^by construction/);
    expect(out.insights[0].fingerprint).toBe("f");
    expect(out.insights[1]).toEqual(before);
  });
});
