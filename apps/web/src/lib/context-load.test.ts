// Unit tests for the "Why this matters" checks (issue #115): the number-to-quote check, review dates,
// framing rules, and the real content files.
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkContext, loadContexts, numbersIn, quoteHas } from "./context-load.mts";

const appDir = fileURLToPath(new URL("../..", import.meta.url));
const IDS = new Set(["traffic", "vmt", "smoking"]);
const base = () => ({
  approved: false,
  framing: "preventable-harm",
  reviewed: "2026-10-12",
  review_by: "2028-04-12",
  summary: ["Nationally, in 2023, 40,901 people were killed.[1]"],
  points: ["Speed: 29 percent died in speeding-related crashes.[1]"],
  linked: [{ id: "vmt", why: "Miles driven" }],
  sources: [{ title: "NHTSA", url: "https://example.gov/a", quotes: ["from 42,721 in 2022 to 40,901 in 2023", "and 29 percent of all those killed"] }],
});
const check = (over: Record<string, unknown>, today = "2026-10-12") => checkContext("traffic", { ...base(), ...over }, IDS, today);

describe("numbers and quotes", () => {
  it("finds the numbers a reader sees, not citation markers", () => {
    expect(numbersIn("In 2023, 40,901 people (29.5%) died.[1][2]")).toEqual(["2023", "40,901", "29.5"]);
  });
  it("matches whole numbers only", () => {
    expect(quoteHas("to 40,901 in 2023", "40,901")).toBe(true);
    expect(quoteHas("to 140,901 in 2023", "40,901")).toBe(false);
    expect(quoteHas("a 4.3-percent decrease", "4.3")).toBe(true);
    expect(quoteHas("half (49%) were", "49")).toBe(true);
    expect(quoteHas("1.49 per", "49")).toBe(false);
  });
});

describe("checkContext", () => {
  it("accepts a good file and gives the framing's heading", () => {
    const { ctx, warnings } = check({});
    expect(ctx.heading).toBe("What's behind it");
    expect(warnings).toEqual([]);
  });
  it("fails a number no cited quote contains", () => {
    expect(() => check({ points: ["Speed: 31 percent died.[1]"] })).toThrow(/"31" is in no quote/);
  });
  it("fails a line with no citation, or a citation to nothing", () => {
    expect(() => check({ points: ["Speed kills."] })).toThrow(/cites a source/);
    expect(() => check({ points: ["Speed kills.[2]"] })).toThrow(/\[2\] points at no source/);
  });
  it("fails an uncited source and a linked map not in the registry", () => {
    expect(() => check({ sources: [...base().sources, { title: "B", url: "https://b.gov", quotes: ["x"] }] })).toThrow(/source 2 is never cited/);
    expect(() => check({ linked: [{ id: "nope", why: "x" }] })).toThrow(/isn't another dataset/);
  });
  it("never calls a disparity map preventable", () => {
    expect(() => check({ framing: "disparity", points: ["Largely preventable.[1]"] })).toThrow(/never called preventable/);
  });
  it("holds review_by to 18 months and warns once it passes", () => {
    expect(() => check({ review_by: "2028-04-13" })).toThrow(/at most 18 months/);
    expect(check({}, "2028-04-13").warnings[0]).toMatch(/review_by 2028-04-12 has passed/);
  });
  it("requires approved to be set", () => {
    expect(() => check({ approved: undefined })).toThrow(/approved must be/);
  });
});

describe("content/context", () => {
  it("every real file passes, and production leaves out drafts", () => {
    const ids = new Set(["traffic_fatalities", "smoking", "vmt_per_capita", "population_density", "aadt", "copd", "heart_disease", "stroke", "cancer"]);
    const all = loadContexts(appDir, ids, true).contexts;
    expect(all.map((c) => c.id).sort()).toEqual(["smoking", "traffic_fatalities"]);
    expect(loadContexts(appDir, ids, false).contexts.filter((c) => !c.approved)).toEqual([]);
  });
});
