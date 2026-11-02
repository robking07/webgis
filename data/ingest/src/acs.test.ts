import { expect, it } from "vitest";
import { renameCounties } from "./acs.ts";
import type { Row } from "./counts.ts";

it("renames counties to 2019 codes and drops a county merged into one that's already there", () => {
  const r = (n: number) => n as unknown as Row;
  const out = renameCounties(new Map([["46113", r(1)], ["51019", r(2)], ["51515", r(3)], ["27053", r(4)], ["46113940500", r(5)]]));
  expect([...out]).toEqual([["46102", 1], ["51019", 2], ["27053", 4], ["46102940500", 5]]);
});
