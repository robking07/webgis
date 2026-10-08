// DOE Low-Income Energy Affordability Data (LEAD Tool, 2022 update), driven by registry entries with
// `measure.kind: lead`. DOE/NREL publish one zip per state (50 + DC + PR) on OEDI (CC BY 4.0, no key),
// each holding county and tract CSVs for four income groupings. Every row is a modelled cohort of
// households (income band × tenure × building age × building type × heating fuel) with *sums*:
// household count, income × households, and electricity / gas / other-fuel cost × households.
// Because the columns are sums, any area's figure is a ratio of sums: we add the cohort rows of the
// chosen income bands up to tract, county and state, then divide (never an average of ratios).
//
// The zips total ~7.3 GB, mostly groupings we don't use, so we read each zip's directory over HTTP
// range requests and cache only the one CSV we need (the tract file of the chosen grouping, ~30% of
// the zip). Counties and states are rolled up from tracts; the sums match DOE's own county files
// exactly. LEAD 2022 already uses Connecticut's 2022 planning-region codes, so no crosswalk is needed.
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { PassThrough, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import unzipper from "unzipper";
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { CACHE, db, log, splitCsv, STATES } from "./util.ts";
import { registerDataset, writeValues, type Level, type Value } from "./values.ts";

/** The summed columns we read, in this order (names as in the LEAD data dictionary). */
export const SUM_COLS = ["UNITS", "HINCP*UNITS", "ELEP*UNITS", "GASP*UNITS", "FULP*UNITS", "HINCP UNITS", "ELEP UNITS", "GASP UNITS", "FULP UNITS"] as const;
const [UNITS, INC, ELE, GAS, FUL, INC_N, ELE_N, GAS_N, FUL_N] = SUM_COLS.map((_, i) => i);
export type Sums = number[];
const zero = (): Sums => SUM_COLS.map(() => 0);

/** Column positions in a LEAD CSV header. County and tract files order their columns differently,
 *  so everything is found by name. `band` is the income-grouping column (AMI150, FPL150, SMI60, LLSI). */
export interface LeadHeader { fip: number; band: number; cols: number[] }
export function parseLeadHeader(line: string, bandColumn: string): LeadHeader {
  const h = splitCsv(line.replace(/^﻿/, "")).map((c) => c.trim());
  const fip = h.indexOf("FIP"), band = h.indexOf(bandColumn);
  const cols = SUM_COLS.map((c) => h.indexOf(c));
  const missing = [fip < 0 ? "FIP" : "", band < 0 ? bandColumn : "", ...SUM_COLS.filter((_, i) => cols[i] < 0)].filter(Boolean);
  if (missing.length) throw new Error(`lead: CSV header lacks ${missing.join(", ")}`);
  return { fip, band, cols };
}

/** One cohort row → [geoid, band, sums], or null for blank lines. Geoids are zero-padded to 5 (county)
 *  or 11 (tract) digits; blank numbers count as 0. */
export function parseLeadRow(line: string, h: LeadHeader, geoLen: 5 | 11): [string, string, Sums] | null {
  if (!line.trim()) return null;
  const f = splitCsv(line);
  const sums = h.cols.map((i) => { const v = Number(f[i]); return Number.isFinite(v) ? v : 0; });
  return [f[h.fip].trim().padStart(geoLen, "0"), f[h.band].trim(), sums];
}

export function addSums(acc: Map<string, Sums>, key: string, s: Sums) {
  const a = acc.get(key) ?? acc.set(key, zero()).get(key)!;
  for (let i = 0; i < s.length; i++) a[i] += s[i];
}

export type LeadStat = "burden" | "cost";
/** The published figure for summed cohorts, as DOE defines it: average annual energy cost ÷ average
 *  annual household income. Each average uses its own household count (households whose bill is in
 *  their rent have no cost for that fuel, so they are left out of that fuel's average, not counted as $0).
 *  - burden: 100 × (Σ elec/n_elec + Σ gas/n_gas + Σ other/n_other) ÷ (Σ income/n_income), in percent;
 *  - cost: Σ elec/n_elec + Σ gas/n_gas + Σ other/n_other, dollars per household per year.
 *  Null when the area has fewer than `minUnits` households in the group or no positive income. */
export function leadValue(s: Sums, stat: LeadStat, minUnits = 0): number | null {
  if (!(s[UNITS] > 0) || s[UNITS] < minUnits) return null;
  const avg = (sum: number, n: number) => (n > 0 ? sum / n : 0);
  const cost = avg(s[ELE], s[ELE_N]) + avg(s[GAS], s[GAS_N]) + avg(s[FUL], s[FUL_N]);
  if (stat === "cost") return s[ELE_N] + s[GAS_N] + s[FUL_N] > 0 ? cost : null;
  const income = avg(s[INC], s[INC_N]);
  return income > 0 ? (100 * cost) / income : null;
}

/** Tract sums → tract, county and state sums (geoid prefixes). */
export function rollUp(tracts: Map<string, Sums>) {
  const out: Record<"tract" | "county" | "state", Map<string, Sums>> = { tract: new Map(), county: new Map(), state: new Map() };
  for (const [g, s] of tracts) {
    addSums(out.tract, g, s);
    addSums(out.county, g.slice(0, 5), s);
    addSums(out.state, g.slice(0, 2), s);
  }
  return out;
}

/** A zip entry fetched with HTTP range requests (only the directory and that entry are downloaded),
 *  cached as data/cache/<dir>/<entry name>. */
export async function cachedZipEntry(url: string, entry: RegExp, dir: string): Promise<string> {
  const source = {
    size: async () => {
      const r = await fetch(url, { method: "HEAD" });
      const n = Number(r.headers.get("content-length"));
      if (!r.ok || !n) throw new Error(`HEAD ${url} → ${r.status}`);
      return n;
    },
    stream: (offset: number, length?: number) => {
      const out = new PassThrough();
      const range = `bytes=${offset}-${length ? offset + length - 1 : ""}`;
      fetch(url, { headers: { range } }).then((r) => {
        if (r.status !== 206 || !r.body) throw new Error(`GET ${url} (${range}) → ${r.status}`);
        Readable.fromWeb(r.body as never).pipe(out);
      }).catch((err) => out.destroy(err));
      return out;
    },
  };
  const zip = await unzipper.Open.custom(source as never);
  const f = zip.files.find((x) => entry.test(x.path));
  if (!f) throw new Error(`${url}: no entry matching ${entry} (has ${zip.files.map((x) => x.path).join(", ")})`);
  const path = join(CACHE, dir, f.path);
  if (existsSync(path)) return path;
  mkdirSync(join(CACHE, dir), { recursive: true });
  await pipeline(f.stream(), createWriteStream(`${path}.part`));
  renameSync(`${path}.part`, path);
  return path;
}

const BAND_COLUMN: Record<string, string> = { AMI: "AMI150", FPL: "FPL150", SMI: "SMI60", LLSI: "LLSI" };

/** Every tract's summed cohorts for one state and grouping, split by income band. */
async function readStateTracts(url: string, st: string, grouping: string, year: number): Promise<Map<string, Map<string, Sums>>> {
  const name = `${st} ${grouping} Census Tracts ${year}.csv`;
  const path = existsSync(join(CACHE, `lead-${year}`, name)) ? join(CACHE, `lead-${year}`, name)
    : await cachedZipEntry(url.replace("{ST}", st), new RegExp(`^${st} ${grouping} Census Tracts ${year}\\.csv$`), `lead-${year}`);
  const byBand = new Map<string, Map<string, Sums>>();
  let h: LeadHeader | null = null;
  for await (const line of createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity })) {
    if (!h) { h = parseLeadHeader(line, BAND_COLUMN[grouping]); continue; }
    const r = parseLeadRow(line, h, 11);
    if (!r) continue;
    addSums(byBand.get(r[1]) ?? byBand.set(r[1], new Map()).get(r[1])!, r[0], r[2]);
  }
  return byBand;
}

export async function ingestLead(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "lead" && (!only || only.includes(e.id)));
  if (!entries.length) return;
  // One pass over the states per source file, filling every entry's tract sums.
  const sources = new Map<string, DatasetEntry[]>();
  for (const e of entries) {
    if (e.measure.kind !== "lead") continue;
    const k = `${e.measure.url}|${e.measure.grouping}|${e.measure.year}`;
    (sources.get(k) ?? sources.set(k, []).get(k)!).push(e);
  }
  const pool = db();
  for (const [k, list] of sources) {
    const [url, grouping, year] = k.split("|");
    const tracts = new Map(list.map((e) => [e.id, new Map<string, Sums>()]));
    for (const [, [, st]] of Object.entries(STATES)) {
      const byBand = await readStateTracts(url, st, grouping, Number(year));
      for (const e of list) {
        if (e.measure.kind !== "lead") continue;
        const bands = e.measure.bands;
        for (const [band, m] of byBand) {
          if (bands.length && !bands.includes(band)) continue;
          for (const [g, s] of m) addSums(tracts.get(e.id)!, g, s);
        }
      }
      log("lead", `${st}: ${[...byBand.values()].reduce((n, m) => Math.max(n, m.size), 0)} tracts, bands ${[...byBand.keys()].join(" ")}`);
    }
    for (const e of list) {
      if (e.measure.kind !== "lead") continue;
      const { stat, minHouseholds } = e.measure;
      const levels = rollUp(tracts.get(e.id)!);
      const us = [...levels.state.values()].reduce((a, s) => { for (let i = 0; i < s.length; i++) a[i] += s[i]; return a; }, zero());
      log(e.id, `United States: ${leadValue(us, stat)?.toFixed(2)} (${Math.round(us[UNITS]).toLocaleString()} households)`);
      await registerDataset(pool, e);
      for (const level of e.geographyLevels as Level[]) {
        if (level !== "tract" && level !== "county" && level !== "state") continue;
        const values = new Map<string, Value>();
        for (const [g, s] of levels[level]) values.set(g, { value: leadValue(s, stat, level === "tract" ? minHouseholds : 0), moe: null });
        await writeValues(pool, e.id, level, values);
      }
    }
  }
  await pool.end();
}
