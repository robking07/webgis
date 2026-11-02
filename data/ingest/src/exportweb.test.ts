import { expect, it } from "vitest";
import { carryOver, periodLosses } from "./exportweb.ts";

it("lists datasets and stops that lost years, ignores additions", () => {
  const old = { a: { s1: ["tract"], s2: ["tract"] }, b: { s1: ["county"] } };
  expect(periodLosses(old, { a: { s1: ["tract"] }, c: { x: ["state"] } })).toEqual(["a/s2", "b"]);
  expect(periodLosses(old, { ...old, d: { s: ["state"] } })).toEqual([]);
});

it("carries over old entries only for datasets with no local folder", () => {
  const old = { a: { s1: ["county"] }, b: { s1: ["county"] } };
  const next = { b: { s2: ["state"] } };
  carryOver(old, next, new Set(["b"]));
  expect(next).toEqual({ a: { s1: ["county"] }, b: { s2: ["state"] } });
});
