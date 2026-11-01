import { describe, expect, it } from "vitest";
import { addPairs, summarize } from "./commute.ts";

const HEAD = "w_geocode,h_geocode,S000,SA01,SA02,SA03,SE01,SE02,SE03,SI01,SI02,SI03,createdate";
const row = (w: string, h: string, n: number) => `${w},${h},${n},0,0,0,0,0,0,0,0,0,20250101`;
const blk = (county: string, i = 1) => county + String(i).padStart(10, "0");
// Connecticut blocks keep the old county codes (09003 = Hartford County); the crosswalk gives the planning region.
const CT: Record<string, string> = { [blk("09003")]: "09110", [blk("09003", 2)]: "09110" };
const county = (b: string) => (b.startsWith("09") ? CT[b] : b.slice(0, 5));

describe("commute county pairs", () => {
  it("sums main and aux blocks to county pairs, remapping Connecticut", async () => {
    const pairs = new Map<string, number>();
    // WA main: Clark County works and lives at home.
    await addPairs([HEAD, row(blk("53011"), blk("53011"), 100), row(blk("53011", 2), blk("53011", 3), 50)], pairs, county);
    // WA aux: works in Clark, lives in Multnomah County, OR.
    await addPairs([HEAD, row(blk("53011"), blk("41051"), 30), row(blk("53011", 4), blk("41051", 2), 5)], pairs, county);
    // OR aux: lives in Clark, works in Multnomah.
    await addPairs([HEAD, row(blk("41051"), blk("53011"), 70)], pairs, county);
    // NY aux: works in New York County, lives in Connecticut (old county codes).
    await addPairs([HEAD, row(blk("36061"), blk("09003"), 4), row(blk("36061"), blk("09003", 2), 6)], pairs, county);
    expect(Object.fromEntries(pairs)).toEqual({ "5301153011": 150, "5301141051": 35, "4105153011": 70, "3606109110": 10 });

    const out = summarize(pairs);
    // Clark: 185 jobs located there, 220 jobs held by residents, 150 both.
    expect(out["53011"]).toEqual([185, 220, 150, [["41051", 35]], [["41051", 70]]]);
    expect(out["09110"]).toEqual([0, 10, 0, [], [["36061", 10]]]);
  });

  it("keeps the top 10 others and leaves out states with no file", () => {
    const pairs = new Map(Array.from({ length: 12 }, (_, i) => [`27053${String(27001 + i)}`, 100 - i] as [string, number]));
    pairs.set("2705327053", 500);
    pairs.set("0201327053", 9); // works in Alaska (no file): no Alaska entry
    const out = summarize(pairs, new Set(["02"]));
    expect(out["02013"]).toBeUndefined();
    const [workers, residents, same, live, work] = out["27053"];
    expect([workers, residents, same]).toEqual([500 + 1134, 509, 500]);
    expect(live).toHaveLength(10);
    expect(live[0]).toEqual(["27001", 100]);
    expect(work).toEqual([["02013", 9]]);
  });
});
