import { describe, expect, it } from "vitest";
import { parseAgent, parseFinished, parseTokens, totals } from "./disclosures-load.mts";

const MD = `# Progress

## Now

| not | this | table |
|---|---|---|

## Finished

| Task | Issue | PR | Size / budget | Actual tokens | Ratio | Model / effort | Date |
|---|---|---|---|---|---|---|---|
| A one | #1 | #2 | S / ~100k | 163k | 1.6x | Sonnet / medium | 2026-10-05 |
| F9 audit | #86 | #88 | S / ~100k | 97k + 40k review | 1.37x | Opus / low | 2026-10-05 |
| S2 data | #96, #106 | #110 | M / ~275k | not recorded | n/a | Opus / medium | 2026-10-06 |
| Broken row | #1 |

## Lessons

| x | y | z | a | b | c | d | e |
`;

describe("parseTokens", () => {
  it("reads k and M, adds parts, and returns null without a number", () => {
    expect(parseTokens("163k")).toBe(163000);
    expect(parseTokens("97k + 40k review")).toBe(137000);
    expect(parseTokens("1.2M")).toBe(1200000);
    expect(parseTokens("not recorded")).toBeNull();
    expect(parseTokens("~")).toBeNull();
  });
});

describe("parseFinished", () => {
  const rows = parseFinished(MD);
  it("reads only the Finished table and skips malformed rows", () => {
    expect(rows.map((r) => r.task)).toEqual(["A one", "F9 audit", "S2 data"]);
    expect(rows[2]).toMatchObject({ issue: "#96, #106", pr: "#110", model: "Opus / medium", date: "2026-10-06", tokens: null });
  });
  it("totals tokens where they parse and counts rows with none", () => {
    expect(totals(rows)).toEqual({ rows: 3, counted: 2, noNumber: 1, tokens: 300000 });
  });
  it("returns nothing when there is no Finished section", () => {
    expect(parseFinished("# x\n\n## Now\n")).toEqual([]);
  });
});

describe("parseAgent", () => {
  it("reads name, model and effort from front matter", () => {
    expect(parseAgent("---\nname: lead\nmodel: opus\neffort: medium\ndescription: Hi: there\n---\nbody"))
      .toEqual({ name: "lead", model: "opus", effort: "medium", description: "Hi: there" });
    expect(parseAgent("no front matter")).toBeNull();
  });
});
