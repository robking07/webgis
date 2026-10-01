// CEJST (Justice40) roll-up (registry `measure.kind: cejst`): share of residents living in
// tracts identified as disadvantaged, by county and state, from the CEJST 2.0 CSV (2010 tracts).
import { readFileSync } from "node:fs";
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, FIPS_RENAMES, log, splitCsv } from "./util.ts";
import { landArea, registerDataset, writeValues, type Level, type Value } from "./values.ts";

export async function ingestCejst(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "cejst" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "cejst") continue;
    await registerDataset(pool, e);
    const text = readFileSync(await cached(e.measure.url, e.measure.file), "utf8").replace(/^﻿/, "");
    const lines = text.split(/\r?\n/);
    const h = splitCsv(lines[0]);
    const iT = h.indexOf("Census tract 2010 ID"), iD = h.indexOf("Identified as disadvantaged"), iP = h.indexOf("Total population");
    if (iT < 0 || iD < 0 || iP < 0) throw new Error("CEJST CSV: expected columns not found");
    const acc: Record<Level, Map<string, [number, number]>> = { state: new Map(), county: new Map(), tract: new Map() };
    let tracts = 0;
    for (const line of lines.slice(1)) {
      if (!line) continue;
      const f = splitCsv(line);
      const geoid = f[iT].padStart(11, "0"), pop = Number(f[iP]) || 0, dis = f[iD] === "True";
      const raw = geoid.slice(0, 5), cty = FIPS_RENAMES[raw] ?? raw;
      for (const [lvl, g] of [["state", geoid.slice(0, 2)], ["county", cty]] as const) {
        const a = acc[lvl].get(g) ?? [0, 0];
        a[0] += dis ? pop : 0; a[1] += pop;
        acc[lvl].set(g, a);
      }
      tracts++;
    }
    log(e.id, `${tracts.toLocaleString()} tracts`);
    for (const level of e.geographyLevels as Level[]) {
      if (level === "tract") continue;
      const known = await landArea(pool, level);
      const values = new Map<string, Value>();
      for (const g of known.keys()) {
        const a = acc[level].get(g);
        values.set(g, { value: a && a[1] > 0 ? (100 * a[0]) / a[1] : null, moe: null });
      }
      // Connecticut's 2010 counties don't match its 2022 planning regions: those stay no data.
      const unmatched = [...acc[level].keys()].filter((g) => !known.has(g));
      if (unmatched.length) log(e.id, `${level}: ${unmatched.length} 2010 codes not in current geography (e.g. ${unmatched.slice(0, 4).join(", ")})`);
      await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
