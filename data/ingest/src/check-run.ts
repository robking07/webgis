// Input check for the GitHub data run (#369, D-478): every step must be one the runner can do, and
// every step must load every dataset named, so a run can't go green having loaded nothing. On
// GitHub it also writes the run's `mode` to GITHUB_OUTPUT, which data-run.yml gates its steps on.
//   STEPS="acs timeline" DATASETS="pct_poverty" node data/ingest/src/check-run.ts
import type { DatasetEntry } from "@webgis/registry";
import { loadRegistry } from "@webgis/registry/load";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Steps the runner can do, each with the registry `measure.kind`s it loads. `features` gets GDAL
 *  and tippecanoe from data-run.yml and publishes tiles, not values (#449). `counts` writes only the
 *  margins, counts and U.S. rows (D-257), ACS maps only (#454).
 *  shortcut: other steps needing GDAL or tippecanoe (geographies, tiles, census2020, ddp287g, vmt,
 *  label-mask, mpo) aren't here, nor `counts` for non-ACS sources; add them the way `features` is when one is needed. */
const STEP_KINDS: Record<string, string[]> = {
  acs: ["acs5"], "acs-bg": ["acs5"], lodes: ["lodes"], places: ["places"], climdiv: ["climdiv"], nbi: ["nbi"],
  fars: ["fars"], airquality: ["airquality"], overdose: ["overdose"], cejst: ["cejst"], tri: ["tri"],
  lead: ["lead"], "food-access": ["food_access"], nri: ["fema_nri"], "fema-disasters": ["fema_declarations"], svi: ["svi"], features: ["features"], counts: ["acs5"],
  timeline: ["acs5", "climdiv", "nbi", "lodes", "overdose", "fars"],
  // #469: commute flows (LODES od), one national file, no registry dataset: named alone, with no ids.
  commute: [],
};
/** Steps that run alone, each its own mode in data-run.yml. */
const ALONE = ["features", "counts", "commute"];
/** Loads nothing: re-exports the database's values and publishes them, every map when no ids are named (#449). */
const REEXPORT = "export-values";

/** What data-run.yml does with valid steps: a source load (`values`) or one of the steps that run alone. */
export const runMode = (steps: string[]) => [REEXPORT, ...ALONE].find((s) => steps.includes(s)) ?? "values";

/** Problems with a run's inputs; empty when it may go ahead. */
export function checkRun(steps: string[], ids: string[], entries: DatasetEntry[]): string[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const errors: string[] = [];
  const reexport = steps.includes(REEXPORT);
  if (!steps.length) errors.push("name at least one step");
  if (!ids.length && !reexport && !steps.includes("commute")) errors.push("name at least one dataset id");
  for (const s of [REEXPORT, ...ALONE]) if (steps.includes(s) && steps.length > 1) errors.push(`step "${s}" runs alone`);
  for (const s of steps) if (!STEP_KINDS[s] && s !== REEXPORT) errors.push(`step "${s}" can't run on GitHub (allowed: ${[...Object.keys(STEP_KINDS), REEXPORT].join(", ")})`);
  for (const id of ids) {
    const e = byId.get(id);
    if (!e) { errors.push(`"${id}" isn't a dataset id in data/registry/datasets`); continue; }
    if (reexport && e.measure.kind === "features") errors.push(`step "${REEXPORT}" has no values for ${id} (features)`);
    for (const s of steps.filter((x) => STEP_KINDS[x])) {
      const ok = STEP_KINDS[s].includes(e.measure.kind)
        && (s !== "timeline" || !!e.timeline)
        && (s !== "acs-bg" || e.geographyLevels.includes("block_group"));
      if (!ok) errors.push(`step "${s}" doesn't load ${id} (${e.measure.kind}${s === "timeline" ? e.timeline ? "" : ", no timeline" : ""})`);
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const words = (v?: string) => (v ?? "").split(/\s+/).filter(Boolean);
  const steps = words(process.env.STEPS);
  const errors = checkRun(steps, words(process.env.DATASETS), loadRegistry());
  for (const e of errors) console.log(`::error::${e}`);
  if (errors.length) process.exit(1);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `mode=${runMode(steps)}\n`);
  console.log(`inputs OK, mode ${runMode(steps)}`);
}
