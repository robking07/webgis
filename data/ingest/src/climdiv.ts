// NOAA nClimDiv county climate ingest, driven by registry entries with
// `measure.kind: climdiv`. Computes a normal (mean of annual values) over the
// entry's years from monthly county series.
import { readFileSync } from "node:fs";
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, log } from "./util.ts";
import { registerDataset, writeValues, type Value } from "./values.ts";

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

export async function ingestClimdiv(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "climdiv" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "climdiv") continue;
    const { element, months, stat, years } = e.measure;
    await registerDataset(pool, e);
    const path = await elementFile(element);
    const perYear = new Map<string, number[]>();
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (line.length < 11) continue;
      const fips = NOAA_TO_FIPS[line.slice(0, 2)];
      const year = +line.slice(7, 11);
      if (!fips || year < years[0] || year > years[1]) continue;
      const monthly = line.slice(11).trim().split(/\s+/).map(Number);
      const picked = months.map((m) => monthly[m - 1]);
      // Missing-value sentinels: -99.90 (temperature) and -9.99 (precipitation).
      if (picked.some((v) => !Number.isFinite(v) || v === -99.9 || v === -9.99)) continue;
      const annual = stat === "sum" ? picked.reduce((a, b) => a + b, 0) : picked.reduce((a, b) => a + b, 0) / picked.length;
      const geoid = fips + line.slice(2, 5);
      (perYear.get(geoid) ?? perYear.set(geoid, []).get(geoid)!).push(annual);
    }
    const span = years[1] - years[0] + 1;
    const values = new Map<string, Value>();
    for (const [g, arr] of perYear) {
      // Require 80% of the normals period, as NOAA does for station normals.
      if (arr.length < span * 0.8) continue;
      values.set(g, { value: arr.reduce((a, b) => a + b, 0) / arr.length, moe: null });
    }
    log(e.id, `${values.size} counties with a ${years[0]}–${years[1]} normal`);
    await writeValues(pool, e.id, "county", values);
  }
  await pool.end();
}
