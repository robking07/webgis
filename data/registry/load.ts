// Node-only loader: reads and validates every registry entry.
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { DatasetEntry } from "./schema.ts";

export const REGISTRY_DIR = join(dirname(fileURLToPath(import.meta.url)), "datasets");

export function loadRegistry(): DatasetEntry[] {
  const entries = readdirSync(REGISTRY_DIR).filter((f) => f.endsWith(".yaml")).sort().map((f) => {
    const raw = parse(readFileSync(join(REGISTRY_DIR, f), "utf8"));
    const res = DatasetEntry.safeParse(raw);
    if (!res.success) throw new Error(`${f}: ${res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    if (`${res.data.id}.yaml` !== f) throw new Error(`${f}: id "${res.data.id}" must match the file name`);
    if (res.data.measure.kind !== "features" && res.data.geographyLevels.length === 0) throw new Error(`${f}: geographyLevels is required for ${res.data.measure.kind} datasets`);
    return res.data;
  });
  return entries;
}
