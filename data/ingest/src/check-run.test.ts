import { describe, expect, it } from "vitest";
import type { DatasetEntry } from "@webgis/registry";
import { checkRun } from "./check-run.ts";

const entry = (id: string, kind: string, extra: object = {}) =>
  ({ id, measure: { kind }, geographyLevels: ["state", "county", "tract"], ...extra }) as unknown as DatasetEntry;
const entries = [
  entry("pct_poverty", "acs5", { timeline: { from: 2014, to: 2024, step: 5 }, geographyLevels: ["county", "block_group"] }),
  entry("traffic_deaths", "fars", { timeline: { from: 2015, to: 2024, step: 1 } }),
  entry("asthma", "places"),
];

describe("checkRun", () => {
  it("passes steps that load every dataset named", () => {
    expect(checkRun(["acs", "acs-bg", "timeline"], ["pct_poverty"], entries)).toEqual([]);
  });
  it("rejects a step that would load nothing for a dataset", () => {
    expect(checkRun(["acs"], ["traffic_deaths"], entries)).toEqual(['step "acs" doesn\'t load traffic_deaths (fars)']);
    expect(checkRun(["timeline"], ["asthma"], entries)).toHaveLength(1);
    expect(checkRun(["acs-bg"], ["asthma"], entries)).toHaveLength(1);
  });
  it("rejects fars' timeline, steps the runner can't do, unknown ids and empty inputs", () => {
    expect(checkRun(["timeline"], ["traffic_deaths"], entries)).toHaveLength(1);
    expect(checkRun(["tiles"], ["asthma"], entries)[0]).toMatch(/can't run on GitHub/);
    expect(checkRun(["places"], ["nope; rm"], entries)[0]).toMatch(/isn't a dataset id/);
    expect(checkRun([], [], entries)).toHaveLength(2);
  });
});
