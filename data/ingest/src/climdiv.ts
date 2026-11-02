// NOAA nClimDiv county climate ingest, driven by registry entries with
// `measure.kind: climdiv`. Computes a normal (mean of annual values) over the
// entry's years from monthly county series, plus single years for the year control.
import { readFileSync } from "node:fs";
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, log } from "./util.ts";
import type { DatasetEntry } from "@webgis/registry";
import { timelineStops } from "@webgis/registry/timeline";
import { registerDataset, writeStopValues, writeValues, type Value } from "./values.ts";

const BASE = "https://www.ncei.noaa.gov/pub/data/cirs/climdiv";

/** NOAA state codes (alphabetical, 01–50; no DC/PR) → FIPS. */
const NOAA_TO_FIPS: Record<string, string> = {
  "01": "01", "02": "04", "03": "05", "04": "06", "05": "08", "06": "09", "07": "10", "08": "12", "09": "13", "10": "16",
  "11": "17", "12": "18", "13": "19", "14": "20", "15": "21", "16": "22", "17": "23", "18": "24", "19": "25", "20": "26",
  "21": "27", "22": "28", "23": "29", "24": "30", "25": "31", "26": "32", "27": "33", "28": "34", "29": "35", "30": "36",
  "31": "37", "32": "38", "33": "39", "34": "40", "35": "41", "36": "42", "37": "44", "38": "45", "39": "46", "40": "47",
  "41": "48", "42": "49", "43": "50", "44": "51", "45": "53", "46": "54", "47": "55", "48": "56", "49": "15", "50": "02",
};

async function elementFile(element: string): Promise<string> {
  const listing = await (await fetch(`${BASE}/`)).text();
  const name = [...listing.matchAll(new RegExp(`climdiv-${element}cy-v[0-9.]+-\\d{8}`, "g"))].map((m) => m[0]).sort().pop();
  if (!name) throw new Error(`no climdiv ${element} county file listed`);
  return cached(`${BASE}/${name}`);
}

/** Annual values (mean or sum of the entry's months) by county and year. Years with a
 *  missing month (including the current, partial year) are skipped. */
async function annualValues(e: DatasetEntry): Promise<Map<string, Map<number, number>>> {
  if (e.measure.kind !== "climdiv") throw new Error("not climdiv");
  const { element, months, stat } = e.measure;
  const out = new Map<string, Map<number, number>>();
  for (const line of readFileSync(await elementFile(element), "utf8").split("\n")) {
    if (line.length < 11) continue;
    const fips = NOAA_TO_FIPS[line.slice(0, 2)];
    if (!fips) continue;
    const year = +line.slice(7, 11);
    const monthly = line.slice(11).trim().split(/\s+/).map(Number);
    const picked = months.map((m) => monthly[m - 1]);
    // Missing-value sentinels: -99.90 (temperature), -9.99 (precipitation), -9999 (degree days).
    if (picked.some((v) => !Number.isFinite(v) || v === -99.9 || v === -9.99 || v === -9999)) continue;
    const total = picked.reduce((a, b) => a + b, 0);
    const geoid = fips + line.slice(2, 5);
    (out.get(geoid) ?? out.set(geoid, new Map()).get(geoid)!).set(year, stat === "sum" ? total : total / picked.length);
  }
  return out;
}

export async function ingestClimdiv(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "climdiv" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "climdiv") continue;
    const { years } = e.measure;
    await registerDataset(pool, e);
    const annual = await annualValues(e);
    const span = years[1] - years[0] + 1;
    const values = new Map<string, Value>();
    for (const [g, byYear] of annual) {
      const arr = [...byYear].filter(([y]) => y >= years[0] && y <= years[1]).map(([, v]) => v);
      // Require 80% of the normals period, as NOAA does for station normals.
      if (arr.length < span * 0.8) continue;
      values.set(g, { value: arr.reduce((a, b) => a + b, 0) / arr.length, moe: null });
    }
    log(e.id, `${values.size} counties with a ${years[0]}–${years[1]} normal`);
    await writeValues(pool, e.id, "county", values);
  }
  await pool.end();
}

/** Single years for the year control (D-36), web export only. */
export async function ingestClimdivTimeline(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "climdiv" && e.timeline && (!only || only.includes(e.id)));
  for (const e of entries) {
    const annual = await annualValues(e);
    for (const s of timelineStops(e)) {
      if (s.isDefault) continue;
      const values = new Map<string, Value>();
      const [from, to] = s.span ?? [+s.id, +s.id];
      for (const [g, byYear] of annual) {
        const arr = [...byYear].filter(([y]) => y >= from && y <= to).map(([, v]) => v);
        // Same 80% rule as the normal; a single year needs its one value.
        if (arr.length && arr.length >= (to - from + 1) * 0.8) values.set(g, { value: arr.reduce((a, b) => a + b, 0) / arr.length, moe: null });
      }
      if (!values.size) { log(e.id, `${s.id}: no complete year in nClimDiv yet, skipped`); continue; }
      writeStopValues(e.id, s.id, "county", values);
    }
  }
}
