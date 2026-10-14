// Splash questions (issue #224): the real content file points at real maps, pairs and places, so a
// bad edit fails `npm test` (and the build); plus the checks themselves and the random picking.
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkSplash, loadSplash } from "./splash-load.mts";
import { fill, shuffler } from "@/components/SplashQuestions";
import { DATASET_BY_ID } from "@/lib/registry";
import { pairReason } from "@/lib/layers";
import NAMES from "@/generated/names.json";

const appDir = fileURLToPath(new URL("../..", import.meta.url));
const names = NAMES as Record<string, string>;

describe("content/splash/questions.yaml", () => {
  const { questions } = loadSplash(appDir, DATASET_BY_ID, names, true);

  it("has about 25 questions, no two alike", () => {
    expect(questions.length).toBeGreaterThanOrEqual(20);
    expect(new Set(questions.map((q) => q.text)).size).toBe(questions.length);
  });

  it("every two-map question is a pair the map draws", () => {
    for (const q of questions) {
      const p = new URL(q.link, "https://mapwich.org").searchParams;
      if (p.get("b")) expect([q.text, pairReason(DATASET_BY_ID.get(p.get("d")!)!, DATASET_BY_ID.get(p.get("b")!)!)]).toEqual([q.text, null]);
    }
  });

  it("production builds carry no questions until approved", () => {
    const s = loadSplash(appDir, DATASET_BY_ID, names, false);
    expect(s.approved || s.questions.length === 0).toBe(true);
  });
});

describe("checkSplash", () => {
  const ok = { text: "How many people bike to work in {county}?", link: "/map?d=pct_bike_commute&lv=county", county: "random" };
  const check = (q: Record<string, unknown>) => checkSplash({ approved: false, questions: [q] }, DATASET_BY_ID, names);

  it("accepts each link shape", () => {
    expect(check(ok).questions[0].county).toBe(true);
    expect(check({ text: "Do grads earn more?", link: "/map?d=pct_bachelors_plus&b=median_household_income" }).questions).toHaveLength(1);
    expect(check({ text: "Rent in Denver or Philly?", link: "/compare/08031/42101?d=median_gross_rent" }).questions).toHaveLength(1);
  });

  it("rejects bad edits", () => {
    expect(() => check({ ...ok, link: "/map?d=bike" })).toThrow(/"bike" is not a registry dataset/);
    expect(() => check({ ...ok, link: "/map?d=pct_bike_commute&b=nope" })).toThrow(/second map "nope"/);
    expect(() => check({ ...ok, link: "/map?d=smoking&lv=tract" })).toThrow(/no tract level/);
    expect(() => check({ ...ok, county: undefined })).toThrow(/\{county\}/);
    expect(() => check({ ...ok, text: "Bike?" })).toThrow(/\{county\}/);
    expect(() => check({ ...ok, link: "/map?d=pct_bike_commute&x=1" })).toThrow(/unknown map setting "x"/);
    expect(() => check({ text: "A or B?", link: "/compare/08031/27?d=median_gross_rent" })).toThrow(/two different states or two different counties/);
    expect(() => check({ text: "A or B?", link: "/compare/08999/42101?d=median_gross_rent" })).toThrow(/no place with code 08999/);
    expect(() => check({ text: "A or B?", link: "/compare/08/42?d=smoking" })).toThrow(/no state values/);
    expect(() => check({ text: "Where?", link: "/place/27053" })).toThrow(/must start/);
    expect(() => checkSplash({ questions: [ok] }, DATASET_BY_ID, names)).toThrow(/approved must be/);
  });
});

describe("picking questions", () => {
  it("never repeats one right after itself, across rounds", () => {
    const pick = shuffler(3);
    const seen = Array.from({ length: 300 }, pick);
    expect(seen.every((v, i) => i === 0 || v !== seen[i - 1])).toBe(true);
    expect(new Set(seen.slice(0, 3)).size).toBe(3);
  });

  it("fills {county} with a real county and centers the map on it", () => {
    const s = fill({ text: "Bikes in {county}?", link: "/map?d=pct_bike_commute&lv=county", county: true }, [["27053", "Hennepin County, MN", -93.48, 45.01]]);
    expect(s).toEqual({ text: "Bikes in Hennepin County, MN?", href: "/map?d=pct_bike_commute&lv=county&at=-93.48,45.01,8" });
  });
});
