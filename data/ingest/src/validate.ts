// Validate every registry entry against the schema and the design tokens.
import { loadRegistry, loadRelations } from "@webgis/registry/load";
import { RAMPS, rampColors, type RampId } from "@webgis/design";
import { existsSync, readFileSync } from "node:fs";
import { CHECKS } from "./library.ts";

const entries = loadRegistry();
const problems: string[] = [];
const ids = new Set<string>();
for (const e of entries) {
  if (ids.has(e.id)) problems.push(`${e.id}: duplicate id`);
  ids.add(e.id);
  const ramp = RAMPS[e.symbology.ramp as RampId];
  if (!ramp) { problems.push(`${e.id}: unknown ramp ${e.symbology.ramp}`); continue; }
  try { rampColors(e.symbology.ramp as RampId, e.symbology.classes); }
  catch (err) { problems.push(`${e.id}: ${(err as Error).message}`); }
}
// Library maps (#372) ship only with a passing automatic check from `npm run ingest -- library`.
const checks = existsSync(CHECKS) ? (JSON.parse(readFileSync(CHECKS, "utf8")) as { maps: Record<string, { pass: boolean }> }).maps : {};
const unchecked = entries.filter((e) => e.library && !checks[e.id]?.pass).map((e) => e.id);
if (unchecked.length) problems.push(`${unchecked.length} Library map(s) without a passing check (run \`npm run ingest -- library\`): ${unchecked.join(", ")}`);
// relations.yaml (#156): every map listed, parts and links point at real maps.
let relations = 0;
try { relations = Object.keys(loadRelations(entries).maps).length; } catch (err) { problems.push((err as Error).message); }
if (problems.length) { console.error("✗ registry invalid:\n  " + problems.join("\n  ")); process.exit(1); }
console.log(`✓ registry valid: ${entries.length} datasets, ${relations} in relations.yaml`);
