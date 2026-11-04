// BLS Quarterly Census of Employment and Wages (public domain): annual average jobs and pay, all
// industries, all ownerships, by state and county, each year from 1990. One public "annual by
// industry" zip per year; only its total-all-industries CSV is read (range requests, zip.ts). No key.
// Registry `measure.kind: qcew` (#516). Residents come from the Census population estimates (popest.ts).
import { loadRegistry } from "@webgis/registry/load";
import { timelineStops } from "@webgis/registry/timeline";
import { CPI_U, db, FIPS_RENAMES, log, splitCsv } from "./util.ts";
import { estimatedPop } from "./popest.ts";
import { registerDataset, writeStopValues, writeValues, type Value } from "./values.ts";
import { remoteZipEntry } from "./zip.ts";

/** FIPS (state "27", county "27053") → [annual average jobs, total annual wages], or null where
 *  BLS withheld the figures to protect employers (disclosure code "N"). */
export type Qcew = Map<string, [number, number] | null>;

/** The total-all-industries file: keeps the "Total Covered" rows (own_code 0) of states (agglvl 50)
 *  and counties (agglvl 70). Counties BLS can't place ("999") are skipped (they count in the state);
 *  renamed or merged counties (FIPS_RENAMES) add into the new code. */
export function parseQcew(text: string): Qcew {
  const lines = text.split(/\r?\n/);
  const h = splitCsv(lines[0]);
  const col = (n: string) => { const i = h.indexOf(n); if (i < 0) throw new Error(`QCEW file: no "${n}" column`); return i; };
  const [iA, iO, iL, iD, iE, iW] = ["area_fips", "own_code", "agglvl_code", "disclosure_code", "annual_avg_emplvl", "total_annual_wages"].map(col);
  const out: Qcew = new Map();
  for (const line of lines.slice(1)) {
    const f = splitCsv(line);
    if (f[iO] !== "0" || (f[iL] !== "50" && f[iL] !== "70") || f[iA].endsWith("999")) continue;
    const raw = f[iL] === "50" ? f[iA].slice(0, 2) : f[iA], g = FIPS_RENAMES[raw] ?? raw;
    const prev = out.has(g) ? out.get(g)! : [0, 0];
    if (f[iD] === "N" || !prev) { out.set(g, null); continue; } // a withheld part makes the sum unknown
    const jobs = Number(f[iE]), wages = Number(f[iW]);
    if (!Number.isFinite(jobs) || !Number.isFinite(wages)) throw new Error(`QCEW ${raw}: jobs or wages not a number`);
    out.set(g, [prev[0] + jobs, prev[1] + wages]);
  }
  return out;
}

type Field = "pay" | "per_1k";

/** Average annual pay (wages ÷ jobs) in 2024 dollars, or jobs per 1,000 residents. Withheld places
 *  get a null value (no data, never zero). The rate only goes to places with residents on this
 *  year's boundaries.
 *  shortcut: the population estimates have no Connecticut old counties for 2020–2023, so its
 *  counties get no jobs rate then (pay is unaffected); add old-county estimates if wanted. */
export function qcewValues(q: Qcew, field: Field, year: number, pop: Map<string, number> | null): Map<string, Value> {
  const cpi = CPI_U[year];
  if (!cpi) throw new Error(`no CPI-U for ${year}: add it to CPI_U in util.ts`);
  const out = new Map<string, Value>();
  for (const [g, v] of q) {
    if (field === "pay") { out.set(g, { value: v && v[0] ? (v[1] / v[0]) * (CPI_U[2024] / cpi) : null, moe: null }); continue; }
    const p = pop!.get(g);
    if (p) out.set(g, { value: v ? (v[0] / p) * 1000 : null, moe: null });
  }
  return out;
}

const UA = { "User-Agent": "Mapwich data ingest (https://mapwich.org; non-commercial)" };
const read = (year: number) => remoteZipEntry(`https://data.bls.gov/cew/data/files/${year}/csv/${year}_annual_by_industry.zip`,
  /\.annual 10 [^/]*\.csv$/, `qcew-${year}-annual-total.csv`, UA);

async function qcewYear(field: Field, year: number, level: "state" | "county") {
  const q = new Map([...parseQcew(await read(year))].filter(([g]) => g.length === (level === "state" ? 2 : 5)));
  const withheld = [...q.values()].filter((v) => !v).length;
  if (withheld) log("qcew", `${year} ${level}: ${withheld} withheld by BLS (no data)`);
  return qcewValues(q, field, year, field === "per_1k" ? await estimatedPop(year, level) : null);
}

export async function ingestQcew(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "qcew" && (!only || only.includes(e.id)));
  if (!entries.length) return;
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "qcew") continue;
    await registerDataset(pool, e);
    for (const level of ["state", "county"] as const) await writeValues(pool, e.id, level, await qcewYear(e.measure.field, e.measure.year, level));
  }
  await pool.end();
}

/** Year control (D-36): every year, web export only. */
export async function ingestQcewTimeline(only?: string[]) {
  for (const e of loadRegistry().filter((e) => e.measure.kind === "qcew" && e.timeline && (!only || only.includes(e.id)))) {
    if (e.measure.kind !== "qcew") continue;
    for (const s of timelineStops(e)) {
      if (s.isDefault) continue;
      for (const level of ["state", "county"] as const) writeStopValues(e.id, s.id, level, await qcewYear(e.measure.field, +s.id, level));
    }
  }
}
