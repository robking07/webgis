// Deportation Data Project 287(g) agreements (registry `measure.kind: ddp_287g`): active
// agreements counted by county and state. Read from DDP's xlsx with GDAL.
import { spawnSync } from "node:child_process";
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, log, splitCsv } from "./util.ts";
import { landArea, registerDataset, writeValues, type Level, type Value } from "./values.ts";

export async function ingestDdp287g(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "ddp_287g" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "ddp_287g") continue;
    await registerDataset(pool, e);
    const file = await cached(e.measure.url, e.measure.file);
    const r = spawnSync("ogr2ogr", ["-f", "CSV", "/vsistdout/", file, "Sheet1", "-select", "status,state_fips,county_fips"], { encoding: "utf8", maxBuffer: 1 << 28 });
    if (r.status !== 0) throw new Error(`ogr2ogr failed: ${r.stderr.slice(0, 300)}`);
    const [head, ...lines] = r.stdout.trim().split(/\r?\n/);
    const h = splitCsv(head), iS = h.indexOf("status"), iSt = h.indexOf("state_fips"), iC = h.indexOf("county_fips");
    const counts: Record<Level, Map<string, number>> = { state: new Map(), county: new Map(), tract: new Map() };
    let active = 0;
    for (const line of lines) {
      const f = splitCsv(line);
      if (!e.measure.statuses.includes(f[iS])) continue;
      active++;
      const st = f[iSt].padStart(2, "0"), cty = f[iC];
      if (/^\d{2}$/.test(st)) counts.state.set(st, (counts.state.get(st) ?? 0) + 1);
      if (/^\d{5}$/.test(cty)) counts.county.set(cty, (counts.county.get(cty) ?? 0) + 1);
    }
    log(e.id, `${active.toLocaleString()} agreements with status ${e.measure.statuses.join("/")}`);
    for (const level of e.geographyLevels as Level[]) {
      if (level === "tract") continue;
      const known = await landArea(pool, level);
      const values = new Map<string, Value>();
      // Every place gets a value: no agreement = 0 (a real zero, not missing data).
      for (const g of known.keys()) values.set(g, { value: counts[level].get(g) ?? 0, moe: null });
      const unmatched = [...counts[level].keys()].filter((g) => !known.has(g));
      if (unmatched.length) log(e.id, `${level}: ${unmatched.length} codes not in current geography (${unmatched.slice(0, 5).join(", ")})`);
      await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
