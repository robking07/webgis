// USDA ERS Food Access Research Atlas roll-up (registry `measure.kind: food_access`): a tract count
// (people far from a supermarket, households without a car far from one, residents of flagged tracts)
// summed by county and state and divided by the matching tract total. The atlas uses 2010 tracts; the
// tracts themselves are drawn on their 2010 shapes by `features` entries, as CEJST's are.
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, FIPS_RENAMES, log, splitCsv } from "./util.ts";
import { writeUs } from "./counts.ts";
import { registerDataset, writeValues, type Value } from "./values.ts";
import { unzipEntry } from "./zip.ts";

export interface FoodAccessColumns { count: string; ruralCount?: string; flag?: string; per: string }

/** Atlas CSV text → [count, total] sums by county and state. A "NULL" count is the atlas's way of
 *  saying no one lives beyond that distance, so it counts as 0. County codes renamed since 2010
 *  follow FIPS_RENAMES; Connecticut's 2010 counties stay as they are (no 2022 match). */
export function foodAccessSums(text: string, c: FoodAccessColumns) {
  const lines = text.split(/\r?\n/);
  const h = splitCsv(lines[0]);
  const [iT, iC, iR, iU, iF, iP] = ["CensusTract", c.count, c.ruralCount ?? c.count, "Urban", c.flag ?? "CensusTract", c.per].map((n) => h.indexOf(n));
  if ([iT, iC, iR, iU, iF, iP].some((i) => i < 0)) throw new Error(`food access CSV: missing one of CensusTract, Urban, ${c.count}, ${c.ruralCount ?? ""}, ${c.flag ?? ""}, ${c.per}`);
  const out = { county: new Map<string, [number, number]>(), state: new Map<string, [number, number]>() };
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const f = splitCsv(line);
    const g = f[iT].padStart(11, "0"), raw = g.slice(0, 5);
    const cell = f[f[iU] === "1" ? iC : iR];
    const n = cell === "NULL" ? 0 : Number(cell), per = Number(f[iP]);
    if (!Number.isFinite(n) || !Number.isFinite(per)) throw new Error(`food access CSV: bad number in tract ${g}`);
    const counted = c.flag && f[iF] !== "1" ? 0 : n;
    for (const [m, k] of [[out.county, FIPS_RENAMES[raw] ?? raw], [out.state, g.slice(0, 2)]] as const) {
      const a = m.get(k) ?? m.set(k, [0, 0]).get(k)!;
      a[0] += counted; a[1] += per;
    }
  }
  return out;
}

export async function ingestFoodAccess(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "food_access" && (!only || only.includes(e.id)));
  if (!entries.length) return;
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "food_access") continue;
    const m = e.measure;
    await registerDataset(pool, e);
    const sums = foodAccessSums(await unzipEntry(await cached(m.url, m.file), new RegExp(`^${m.entry}$`)), m);
    const us = [...sums.state.values()].reduce((a, s) => [a[0] + s[0], a[1] + s[1]], [0, 0]);
    log(e.id, `United States: ${((100 * us[0]) / us[1]).toFixed(2)}% (${Math.round(us[0]).toLocaleString()} of ${Math.round(us[1]).toLocaleString()})`);
    writeUs(e.id, null, { value: (100 * us[0]) / us[1], moe: null }, null);
    for (const level of ["state", "county"] as const) {
      if (!e.geographyLevels.includes(level)) continue;
      const values = new Map<string, Value>();
      for (const [g, [n, per]] of sums[level]) values.set(g, { value: per > 0 ? (100 * n) / per : null, moe: null });
      await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
