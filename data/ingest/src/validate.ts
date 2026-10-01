// Validate every registry entry against the schema and the design tokens.
import { loadRegistry } from "@webgis/registry/load";
import { RAMPS, rampColors, type RampId } from "@webgis/design";

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
if (problems.length) { console.error("✗ registry invalid:\n  " + problems.join("\n  ")); process.exit(1); }
console.log(`✓ registry valid: ${entries.length} datasets`);
