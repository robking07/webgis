// Census Small Area Health Insurance Estimates (registry `measure.kind: sahie`): percent uninsured
// under 65 (all races, sexes and incomes) by county and state, from the yearly CSV on www2.census.gov
// (the API now needs a key; the file doesn't). Model-based; margins are 90% like the ACS.
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, log } from "./util.ts";
import { registerDataset, writeValues, type Value } from "./values.ts";
import { unzipEntry } from "./zip.ts";

/** SAHIE CSV text (a long notes preamble, then `year,version,statefips,…`) → PCTUI and its MOE for
 *  the all-groups rows, by state and county FIPS. "." (Kalawao, HI) becomes no value. */
export function parseSahie(text: string) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith("year,version,"));
  if (start < 0) throw new Error("SAHIE CSV: no header row");
  const h = lines[start].split(",").map((c) => c.trim());
  const col = (n: string) => { const i = h.indexOf(n); if (i < 0) throw new Error(`SAHIE CSV: no ${n} column`); return i; };
  const [iS, iC, iG, iA, iR, iX, iI, iP, iM] = ["statefips", "countyfips", "geocat", "agecat", "racecat", "sexcat", "iprcat", "PCTUI", "pctui_moe"].map(col);
  const out = { state: new Map<string, Value>(), county: new Map<string, Value>() };
  for (const line of lines.slice(start + 1)) {
    const f = line.split(",").map((c) => c.trim());
    if (f.length < h.length || f[iA] !== "0" || f[iR] !== "0" || f[iX] !== "0" || f[iI] !== "0") continue;
    const num = (s: string) => (s === "." || s === "" ? null : Number(s));
    const v: Value = { value: num(f[iP]), moe: num(f[iM]) };
    if (f[iG] === "40") out.state.set(f[iS], v);
    else if (f[iG] === "50") out.county.set(f[iS] + f[iC], v);
  }
  return out;
}

export async function ingestSahie(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "sahie" && (!only || only.includes(e.id)));
  if (!entries.length) return;
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "sahie") continue;
    const { year } = e.measure;
    const zip = await cached(`https://www2.census.gov/programs-surveys/sahie/datasets/time-series/estimates-acs/sahie-${year}-csv.zip`);
    const rows = parseSahie(await unzipEntry(zip, new RegExp(`sahie_${year}\\.csv$`)));
    await registerDataset(pool, e);
    for (const level of ["state", "county"] as const) if (e.geographyLevels.includes(level)) await writeValues(pool, e.id, level, rows[level]);
  }
  await pool.end();
}
