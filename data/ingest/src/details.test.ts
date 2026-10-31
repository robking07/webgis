import { describe, expect, it } from "vitest";
import { buildShards } from "./details.ts";

const geo = (geoid: string, level: string, name: string) => ({ geoid, level, name, state_fips: geoid.slice(0, 2), lon: -93, lat: 45, aland_sqmi: 100 });

describe("buildShards", () => {
  const shards = buildShards(
    [geo("27053", "county", "Hennepin County, MN"), geo("27", "state", "Minnesota"), geo("06", "state", "California"), geo("27053026100", "tract", "Tract 261")],
    [
      { dataset_id: "median_age", geoid: "27053", value: 37.1, moe: 0.3 },
      { dataset_id: "gini_index", geoid: "27053", value: 0.48, moe: null },
      { dataset_id: "gini_index", geoid: "27", value: 0.4525, moe: 0.0019 },
      { dataset_id: "gini_index", geoid: "99", value: 1, moe: null },
    ],
  );

  it("writes one file per state holding the state and its counties, not tracts", () => {
    expect([...shards.keys()].sort()).toEqual(["06", "27"]);
    expect(Object.keys(shards.get("27")!)).toEqual(["27", "27053"]);
  });
  it("keeps values and margins of error exactly, with null where there is none", () => {
    expect(shards.get("27")!["27053"].values).toEqual({ gini_index: [0.48, null], median_age: [37.1, 0.3] });
    expect(shards.get("27")!["27"].values).toEqual({ gini_index: [0.4525, 0.0019] });
  });
  it("carries the geography and drops values for unknown places", () => {
    expect(shards.get("27")!["27"]).toMatchObject({ name: "Minnesota", lon: -93, lat: 45, aland_sqmi: 100 });
    expect(shards.get("06")!["06"].values).toEqual({});
  });
  it("sorts datasets so a re-run gives a small diff", () => {
    expect(Object.keys(shards.get("27")!["27053"].values)).toEqual(["gini_index", "median_age"]);
  });
  it("leaves out the datasets it is told to (Library maps)", () => {
    const out = buildShards([geo("27", "state", "Minnesota")],
      [{ dataset_id: "median_age", geoid: "27", value: 38, moe: 0.1 }, { dataset_id: "pct_heat_wood", geoid: "27", value: 4.2, moe: 1.1 }],
      new Set(["pct_heat_wood"]));
    expect(out.get("27")!["27"].values).toEqual({ median_age: [38, 0.1] });
  });
});
