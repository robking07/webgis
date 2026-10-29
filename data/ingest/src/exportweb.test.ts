import { expect, it } from "vitest";
import { periodLosses } from "./exportweb.ts";

it("lists datasets and stops that lost years, ignores additions", () => {
  const old = { a: { s1: ["tract"], s2: ["tract"] }, b: { s1: ["county"] } };
  expect(periodLosses(old, { a: { s1: ["tract"] }, c: { x: ["state"] } })).toEqual(["a/s2", "b"]);
  expect(periodLosses(old, { ...old, d: { s: ["state"] } })).toEqual([]);
});
