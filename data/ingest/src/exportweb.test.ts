import { expect, it } from "vitest";
import { carryOver, periodLosses, registryJsonDrift } from "./exportweb.ts";

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

it("flags a registry.json that doesn't match the YAML entries", () => {
  const entries = [{ id: "a", tags: ["x"] }];
  expect(registryJsonDrift(entries, JSON.stringify(entries, null, 1))).toBeNull();
  expect(registryJsonDrift(entries, JSON.stringify([{ id: "a", tags: [] }], null, 1))).toMatch(/npm run prepare:assets -w web/);
});
