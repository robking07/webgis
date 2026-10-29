// Node-only loader: reads and validates every registry entry.
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { DatasetEntry, GlossaryTerm } from "./schema.ts";
import { CATEGORY_TREE } from "./categories.ts";
import { checkRelations, Relations } from "./relations.ts";

export const REGISTRY_DIR = join(dirname(fileURLToPath(import.meta.url)), "datasets");

export const GLOSSARY_FILE = join(dirname(fileURLToPath(import.meta.url)), "glossary.yaml");

export function loadGlossary(): GlossaryTerm[] {
  const raw = parse(readFileSync(GLOSSARY_FILE, "utf8")) as unknown[];
  return raw.map((t, i) => {
    const r = GlossaryTerm.safeParse(t);
    if (!r.success) throw new Error(`glossary.yaml #${i}: ${r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`);
    return r.data;
  });
}

export function loadRegistry(): DatasetEntry[] {
  const entries = readdirSync(REGISTRY_DIR).filter((f) => f.endsWith(".yaml")).sort().map((f) => {
    const raw = parse(readFileSync(join(REGISTRY_DIR, f), "utf8"));
    const res = DatasetEntry.safeParse(raw);
    if (!res.success) throw new Error(`${f}: ${res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    if (`${res.data.id}.yaml` !== f) throw new Error(`${f}: id "${res.data.id}" must match the file name`);
    const subs: readonly string[] = CATEGORY_TREE[res.data.category];
    if (!subs.includes(res.data.subcategory)) throw new Error(`${f}: subcategory "${res.data.subcategory}" must be one of ${res.data.category}'s: ${subs.join(", ")}`);
    if (res.data.measure.kind !== "features" && res.data.geographyLevels.length === 0) throw new Error(`${f}: geographyLevels is required for ${res.data.measure.kind} datasets`);
    if (res.data.areaLevels.length && (res.data.measure.kind !== "acs5" || res.data.measure.perSqMi)) throw new Error(`${f}: areaLevels is for acs5 datasets without perSqMi`);
    return res.data;
  });
  // Every referenced glossary term must exist.
  const terms = new Set(loadGlossary().map((t) => t.id));
  for (const e of entries) for (const t of [...e.terms, ...e.facets.map((f) => f.term).filter((x): x is string => !!x)]) {
    if (!terms.has(t)) throw new Error(`${e.id}: unknown glossary term "${t}" (add it to glossary.yaml)`);
  }
  return entries;
}

export const RELATIONS_FILE = join(dirname(fileURLToPath(import.meta.url)), "relations.yaml");

/** relations.yaml (#156), parsed and checked against the registry: throws on any problem. */
export function loadRelations(entries: DatasetEntry[] = loadRegistry()): Relations {
  const res = Relations.safeParse(parse(readFileSync(RELATIONS_FILE, "utf8")));
  if (!res.success) throw new Error(`relations.yaml: ${res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const problems = checkRelations(res.data, entries);
  if (problems.length) throw new Error(`relations.yaml:\n  ${problems.join("\n  ")}`);
  return res.data;
}
