// Census Building Permits Survey (public domain): new housing units authorized by building permits,
// by state and county, each calendar year from 1990. One public ASCII file per year and level; no key.
// Registry `measure.kind: bps` (#514). Residents come from the Census population estimates (popest.ts).
import { readFileSync } from "node:fs";
import { loadRegistry } from "@webgis/registry/load";
import { timelineStops } from "@webgis/registry/timeline";
import { cached, db, FIPS_RENAMES, log } from "./util.ts";
import { estimatedPop } from "./popest.ts";
import { registerDataset, writeStopValues, writeValues, type Value } from "./values.ts";

/** FIPS → [units permitted, of them in buildings with 5 or more units]. */
export type Permits = Map<string, [number, number]>;

/** One annual file (`County/coYYYYa.txt` or `State/stYYYYa.txt`). The header's second line names the
 *  columns; after "Name" come Bldgs, Units, Value for 1, 2, 3–4 and 5+ unit buildings: the Census
 *  Bureau's estimates, which impute places that didn't report (the "rep" columns after them don't).
 *  Region, division and U.S. rows are skipped; renamed counties (FIPS_RENAMES) take the new code. */
export function parseBps(text: string): Permits {
  const lines = text.split(/\r?\n/);
  const h = (lines[1] ?? "").split(",").map((c) => c.trim());
  const county = h[2] === "County", iU = h.indexOf("Name") + 2;
  if (iU < 2 || [0, 3, 6, 9].some((k) => h[iU + k] !== "Units")) throw new Error(`building permits file: unexpected header "${lines[1]}"`);
  const out: Permits = new Map();
  for (const line of lines.slice(2)) {
    const f = line.split(",").map((c) => c.trim());
    if (!/^\d\d$/.test(f[1] ?? "") || (county && !/^\d{3}$/.test(f[2] ?? ""))) continue;
    const [u1, u2, u34, u5] = [0, 3, 6, 9].map((k) => Number(f[iU + k]));
    if (![u1, u2, u34, u5].every(Number.isFinite)) throw new Error(`building permits ${f[1]}${county ? f[2] : ""}: units not a number`);
    const raw = county ? f[1] + f[2] : f[1], g = FIPS_RENAMES[raw] ?? raw;
    const prev = out.get(g) ?? [0, 0];
    out.set(g, [prev[0] + u1 + u2 + u34 + u5, prev[1] + u5]);
  }
  return out;
}

type Field = "per_1k" | "multifamily";

/** Units per 1,000 residents, or the % of units in 5+ unit buildings (no value when none were
 *  permitted). Only places with residents on this year's boundaries get a value, so a county with
 *  no permit-issuing places (absent from the file) or under an old code stays "no data".
 *  shortcut: the population estimates have no Connecticut old counties for 2020–2022, so its counties
 *  get no value then (the share needs no residents but uses the same filter); add V2021 estimates if wanted. */
export function bpsValues(permits: Permits, field: Field, pop: Map<string, number>, tag: string): Map<string, Value> {
  const out = new Map<string, Value>(), lost: string[] = [];
  for (const [g, [all, five]] of permits) {
    const p = pop.get(g);
    if (!p) { if (all) lost.push(g); continue; }
    out.set(g, { value: field === "per_1k" ? (all / p) * 1000 : all ? (five / all) * 100 : null, moe: null });
  }
  if (lost.length) log("bps", `${tag}: permits under codes not on the map, left out: ${lost.join(" ")}`);
  return out;
}

const fileFor = (level: "state" | "county", year: number) =>
  `https://www2.census.gov/econ/bps/${level === "state" ? `State/st${year}a.txt` : `County/co${year}a.txt`}`;

async function bpsYear(field: Field, year: number, level: "state" | "county") {
  const permits = parseBps(readFileSync(await cached(fileFor(level, year)), "latin1"));
  return bpsValues(permits, field, await estimatedPop(year, level), `${year} ${level}`);
}

export async function ingestBps(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "bps" && (!only || only.includes(e.id)));
  if (!entries.length) return;
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "bps") continue;
    await registerDataset(pool, e);
    for (const level of ["state", "county"] as const) await writeValues(pool, e.id, level, await bpsYear(e.measure.field, e.measure.year, level));
  }
  await pool.end();
}

/** Year control (D-36): every other permit year, web export only. */
export async function ingestBpsTimeline(only?: string[]) {
  for (const e of loadRegistry().filter((e) => e.measure.kind === "bps" && e.timeline && (!only || only.includes(e.id)))) {
    if (e.measure.kind !== "bps") continue;
    for (const s of timelineStops(e)) {
      if (s.isDefault) continue;
      for (const level of ["state", "county"] as const) writeStopValues(e.id, s.id, level, await bpsYear(e.measure.field, +s.id, level));
    }
  }
}
