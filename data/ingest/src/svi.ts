// CDC/ATSDR Social Vulnerability Index (registry `measure.kind: svi`): county and tract percentile
// ranks from CDC's U.S.-wide CSVs (public domain, no key), cached in data/cache. We use the U.S.
// files, not the per-state ones, so every rank is among all U.S. counties or tracts. 2022 files use
// 2020 tracts and Connecticut's planning regions, like our own geography. Tract values go to static
// files, not the database (D-113), through writeValues.
import { readFileSync } from "node:fs";
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { cached, db, log, splitCsv } from "./util.ts";
import { registerDataset, writeValues, type Value } from "./values.ts";

type SviMeasure = Extract<DatasetEntry["measure"], { kind: "svi" }>;

const FILES = {
  county: (y: number) => `https://svi.cdc.gov/Documents/Data/${y}/csv/states_counties/SVI_${y}_US_county.csv`,
  tract: (y: number) => `https://svi.cdc.gov/Documents/Data/${y}/csv/states/SVI_${y}_US.csv`,
} as const;
const GEOID_LENGTH = { county: 5, tract: 11 } as const;

/** CDC's 0–1 rank as a 0–100 percentile; -999 (CDC's no-data code), blanks and anything
 *  outside 0–1 are no data, never a value. */
export function sviValue(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  return Math.round(n * 10000) / 100;
}

/** geoid → { field → raw text } for the given fields of one SVI CSV. */
export function parseSvi(text: string, fields: string[], geoidLength: number): Map<string, Record<string, string>> {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const header = splitCsv(lines[0]).map((h) => h.trim());
  const fips = header.indexOf("FIPS");
  const cols = fields.map((f) => header.indexOf(f));
  const missing = [fips < 0 ? "FIPS" : "", ...fields.filter((_, i) => cols[i] < 0)].filter(Boolean);
  if (missing.length) throw new Error(`svi: CSV header lacks ${missing.join(", ")}`);
  const out = new Map<string, Record<string, string>>();
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const f = splitCsv(line);
    out.set(f[fips].trim().padStart(geoidLength, "0"), Object.fromEntries(fields.map((k, i) => [k, f[cols[i]]])));
  }
  return out;
}

export async function ingestSvi(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "svi" && (!only || only.includes(e.id)));
  if (!entries.length) return log("svi", "no svi entries selected");
  const years = new Set(entries.map((e) => (e.measure as SviMeasure).year));
  if (years.size !== 1) throw new Error(`svi entries disagree on year: ${[...years].join(", ")}`);
  const year = [...years][0];
  const fields = entries.map((e) => (e.measure as SviMeasure).field);
  const pool = db();
  for (const level of ["county", "tract"] as const) {
    const mine = entries.filter((e) => e.geographyLevels.includes(level));
    if (!mine.length) continue;
    const rows = parseSvi(readFileSync(await cached(FILES[level](year)), "utf8"), fields, GEOID_LENGTH[level]);
    log("svi", `${level}: ${rows.size.toLocaleString()} rows`);
    for (const e of mine) {
      const { field } = e.measure as SviMeasure;
      const values = new Map<string, Value>();
      for (const [geoid, r] of rows) values.set(geoid, { value: sviValue(r[field]), moe: null });
      await registerDataset(pool, e);
      await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
