// Input check for the GitHub data run (#369, D-478): every step must be one the runner can do, and
// every step must load every dataset named, so a run can't go green having loaded nothing.
//   STEPS="acs timeline" DATASETS="pct_poverty" node data/ingest/src/check-run.ts
import type { DatasetEntry } from "@webgis/registry";
import { loadRegistry } from "@webgis/registry/load";
import { fileURLToPath } from "node:url";

/** Steps the runner can do (no GDAL or tippecanoe), each with the registry `measure.kind`s it loads.
 *  shortcut: steps needing GDAL or tippecanoe (geographies, tiles, features, census2020, ddp287g, vmt,
 *  counts, label-mask, mpo) aren't here; install them in data-run.yml when one is needed. */
const STEP_KINDS: Record<string, string[]> = {
  acs: ["acs5"], "acs-bg": ["acs5"], lodes: ["lodes"], places: ["places"], climdiv: ["climdiv"], nbi: ["nbi"],
  fars: ["fars"], airquality: ["airquality"], overdose: ["overdose"], cejst: ["cejst"], tri: ["tri"],
  lead: ["lead"], "food-access": ["food_access"], nri: ["fema_nri"], svi: ["svi"],
  // shortcut: fars' timeline reads population_density's 2019 stop, which a runner doesn't have.
  timeline: ["acs5", "climdiv", "nbi", "lodes", "overdose"],
};

/** Problems with a run's inputs; empty when it may go ahead. */
export function checkRun(steps: string[], ids: string[], entries: DatasetEntry[]): string[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const errors: string[] = [];
  if (!steps.length) errors.push("name at least one step");
  if (!ids.length) errors.push("name at least one dataset id");
  for (const s of steps) if (!STEP_KINDS[s]) errors.push(`step "${s}" can't run on GitHub (allowed: ${Object.keys(STEP_KINDS).join(", ")})`);
  for (const id of ids) {
    const e = byId.get(id);
    if (!e) { errors.push(`"${id}" isn't a dataset id in data/registry/datasets`); continue; }
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
  const errors = checkRun(words(process.env.STEPS), words(process.env.DATASETS), loadRegistry());
  for (const e of errors) console.log(`::error::${e}`);
  if (errors.length) process.exit(1);
  console.log("inputs OK");
}
