// The Library (#372, docs/library.md): one recipe of ACS shares → registry entries with
// `library: true`, each kept only if it passes the automatic checks. No hand review: a map that fails
// is left out (its file removed) and the reason is written to the checks file.
//   npm run ingest -- library            fetch (CENSUS_API_KEY), check, write the passing entries
//   npm run ingest -- library --offline  write every recipe entry, no checks (registry:validate then
//                                         fails on them until the real run, so none can ship unchecked)
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Document, isMap, parse, visit } from "yaml";
import { gradeEstimate } from "@webgis/design";
import { DatasetEntry, GeoLevel } from "@webgis/registry";
import { CATEGORY_TREE, type Category } from "@webgis/registry/categories";
import { derive, fetchLevel, varsOf } from "./acs.ts";
import { log, ROOT } from "./util.ts";

export const RECIPE = join(ROOT, "data/registry/library/acs-profile.yaml");
export const CHECKS = join(ROOT, "data/registry/library/acs-profile.checks.json");
const DATASETS = join(ROOT, "data/registry/datasets");
const LEVELS = ["state", "county", "tract"] as const;
/** Gate thresholds: share of areas with a value, and of those, share with a published margin. */
export const MIN_COVERAGE = 0.9, MIN_MOE = 0.9;

export interface RecipeMap { id: string; title: string; topic: string; universe: string; num: string[]; den?: string[]; text: string; tags: string[] }
export interface Recipe { vintage: string; year: number; ramps: Record<string, string>; tables: Record<string, string>; maps: RecipeMap[] }

export const loadRecipe = (file = RECIPE) => parse(readFileSync(file, "utf8")) as Recipe;

/** One recipe line → the registry entry's YAML fields (`raw`, as written) and the parsed entry. */
export function shape(m: RecipeMap, r: Recipe): { raw: Record<string, unknown>; entry: DatasetEntry } {
  const [category, subcategory] = m.topic.split("/") as [Category, string];
  if (!(CATEGORY_TREE[category] as readonly string[] | undefined)?.includes(subcategory)) throw new Error(`${m.id}: unknown topic ${m.topic}`);
  const table = m.num[0].split("_")[0];
  const profile = table.startsWith("DP");
  if (!r.tables[table]) throw new Error(`${m.id}: add table ${table} to the recipe's tables`);
  const raw = {
    id: m.id, title: m.title, description: m.text, category, subcategory, tags: m.tags,
    source: {
      name: "U.S. Census Bureau, ACS 5-year estimates (added automatically)",
      shortName: "Census Bureau",
      url: `https://data.census.gov/table/ACS${profile ? "DP" : "DT"}5Y${r.year}.${table}`,
      citation: `U.S. Census Bureau, ${r.year - 4}–${r.year} American Community Survey 5-Year Estimates, table ${table} (${r.tables[table]})`,
    },
    license: "Public domain (U.S. Government work, 17 U.S.C. § 105)",
    updateCadence: "annual", vintage: r.vintage, geographyLevels: [...LEVELS], unit: "percent", universe: m.universe,
    terms: ["acs-5-year", "margin-of-error", "census-geography", "quantile-classes"],
    // Data Profile percents are already shares (scale 1); detailed tables are numerator ÷ denominator.
    measure: m.den ? { kind: "acs5", numerator: m.num, denominator: m.den, scale: 100 } : { kind: "acs5", numerator: m.num },
    symbology: { ramp: r.ramps[category], classification: "quantile", classes: 5 },
    library: true,
  };
  const res = DatasetEntry.safeParse(raw);
  if (!res.success) throw new Error(`${m.id}: ${res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  return { raw, entry: res.data };
}

export interface LevelCheck { areas: number; coverage: number; withMoe: number; unreliable: number; min: number | null; max: number | null }
export interface MapCheck { pass: boolean; reasons: string[]; levels: Partial<Record<GeoLevel, LevelCheck>> }

/** The automatic checks for one level: values within 0–100, most areas have a value, most values
 *  carry a margin (so reliability grading works as for every ACS map, D-222). `unreliable` (share of
 *  graded values over 30% CV) is recorded for the lead, not gated. */
export function checkLevel(level: string, values: Array<{ value: number | null; moe: number | null }>): { stats: LevelCheck; reasons: string[] } {
  const got = values.filter((v) => v.value != null);
  const withMoe = got.filter((v) => v.moe != null);
  const graded = withMoe.map((v) => gradeEstimate(v.value, v.moe)).filter((g) => g != null);
  const nums = got.map((v) => v.value!);
  const stats: LevelCheck = {
    areas: values.length,
    coverage: values.length ? got.length / values.length : 0,
    withMoe: got.length ? withMoe.length / got.length : 0,
    unreliable: graded.length ? graded.filter((g) => g === "unreliable").length / graded.length : 0,
    // reduce, not Math.min(...): 85,000 tract values overflow the argument list.
    min: nums.length ? nums.reduce((a, b) => Math.min(a, b)) : null, max: nums.length ? nums.reduce((a, b) => Math.max(a, b)) : null,
  };
  const reasons: string[] = [];
  if (stats.coverage < MIN_COVERAGE) reasons.push(`${level}: only ${pct(stats.coverage)} of areas have a value`);
  if (stats.withMoe < MIN_MOE) reasons.push(`${level}: only ${pct(stats.withMoe)} of values have a margin of error`);
  if (stats.min != null && (stats.min < 0 || stats.max! > 100.0001)) reasons.push(`${level}: values outside 0–100 (${stats.min} to ${stats.max})`);
  return { stats, reasons };
}
const pct = (x: number) => `${Math.round(x * 100)}%`;
const round = (s: LevelCheck): LevelCheck => ({ ...s, coverage: +s.coverage.toFixed(4), withMoe: +s.withMoe.toFixed(4), unreliable: +s.unreliable.toFixed(4) });

/** Lists and the measure/symbology maps on one line each, like the hand-written entries. */
export function toYaml(raw: Record<string, unknown>): string {
  const doc = new Document(raw);
  visit(doc, {
    Seq: (_, n) => { n.flow = true; },
    Pair: (_, p) => { if (isMap(p.value) && ["measure", "symbology"].includes(String(p.key))) p.value.flow = true; },
  });
  return doc.toString({ lineWidth: 0, flowCollectionPadding: false });
}

const HEADER ="# Generated by `npm run ingest -- library` from data/registry/library/acs-profile.yaml (#372).\n# Edit the recipe, not this file. To promote it to Featured, follow docs/library.md.\n";

export async function buildLibrary(offline = false) {
  const recipe = loadRecipe();
  const shaped = recipe.maps.map((m) => shape(m, recipe)), entries = shaped.map((s) => s.entry);
  const checks: Record<string, MapCheck> = offline && existsSync(CHECKS) ? JSON.parse(readFileSync(CHECKS, "utf8")).maps : {};
  if (!offline) {
    const vars = varsOf(entries);
    for (const e of entries) checks[e.id] = { pass: true, reasons: [], levels: {} };
    for (const level of LEVELS) {
      log("library", `fetching ${level} (${vars.length} variables)…`);
      const table = await fetchLevel(level, vars);
      for (const e of entries) {
        const m = e.measure as Extract<DatasetEntry["measure"], { kind: "acs5" }>;
        // A margin counts as present only when every cell's own MOE was published (derive treats a missing one as 0).
        const values = [...table.values()].map((row) => {
          const v = derive(e, row);
          return { value: v.value, moe: [...m.numerator, ...(m.denominator ?? [])].every((x) => row.get(`${x}M`) != null) ? v.moe : null };
        });
        const { stats, reasons } = checkLevel(level, values);
        const c = checks[e.id];
        c.levels[level] = round(stats);
        c.reasons.push(...reasons);
        c.pass = !c.reasons.length;
      }
    }
    writeFileSync(CHECKS, JSON.stringify({ recipe: "acs-profile.yaml", checked: new Date().toISOString().slice(0, 10), maps: checks }, null, 1) + "\n");
  }
  let written = 0;
  for (const { raw, entry: e } of shaped) {
    const file = join(DATASETS, `${e.id}.yaml`);
    if (!offline && !checks[e.id].pass) { rmSync(file, { force: true }); log("library", `left out ${e.id}: ${checks[e.id].reasons.join("; ")}`); continue; }
    writeFileSync(file, HEADER + toYaml(raw));
    written++;
  }
  log("library", `${written} of ${entries.length} maps written${offline ? " (offline: not checked)" : ""}`);
}
