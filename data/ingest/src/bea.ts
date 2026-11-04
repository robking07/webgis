// BEA Regional Economic Accounts, table CAINC1 (public domain): personal income per person, by
// state and county, each year from 1990 (BEA has 1969 on; the CPI-U table starts at 1990). One public
// bulk zip, read by range requests (zip.ts); no key. Registry `measure.kind: bea_income` (#519).
// BEA's own per-capita line is used as published (it divides by BEA's population), never recomputed.
import { loadRegistry } from "@webgis/registry/load";
import { timelineStops } from "@webgis/registry/timeline";
import { BEA_GROUPS } from "@webgis/registry/bea-groups";
import { CPI_U, db, log, splitCsv } from "./util.ts";
import { registerDataset, writeStopValues, writeValues, type Value } from "./values.ts";
import { remoteZipEntry } from "./zip.ts";

/** year → FIPS (state "27", county "27053") → dollars of that year, or null where BEA has no figure. */
export type Bea = Map<number, Map<string, number | null>>;

/** The CAINC1 all-areas file, line 3 (per capita personal income). Keeps states and counties:
 *  skips the U.S., BEA's regions (state code over 56) and any combined area not in BEA_GROUPS
 *  (Alaska's old divisions, Shawano + Menominee), which show no data. "(NA)" and "(D)" cells are null. */
export function parseBea(text: string): Bea {
  const lines = text.split(/\r?\n/);
  const h = splitCsv(lines[0]);
  const iF = h.indexOf("GeoFIPS"), iL = h.indexOf("LineCode");
  const years = h.map((c, i) => [Number(c), i] as const).filter(([y]) => y >= 1969 && y <= 2100);
  if (iF < 0 || iL < 0 || !years.length) throw new Error("BEA CAINC1 file: unexpected header");
  const out: Bea = new Map(years.map(([y]) => [y, new Map()]));
  for (const line of lines.slice(1)) {
    const f = splitCsv(line).map((c) => c.trim());
    const g = f[iF];
    if (f[iL] !== "3" || !/^\d{5}$/.test(g) || +g.slice(0, 2) < 1 || +g.slice(0, 2) > 56) continue;
    const state = g.endsWith("000");
    const places = BEA_GROUPS[g] ?? (state ? [g.slice(0, 2)] : g[2] === "9" ? [] : [g]);
    for (const [y, i] of years) {
      const cell = f[i] ?? "";
      if (!/^\d+(\.\d+)?$/.test(cell) && !/^\(\w+\)$/.test(cell)) throw new Error(`BEA ${g} ${y}: "${cell}" is not a number`);
      for (const p of places) out.get(y)!.set(p, /^\(/.test(cell) ? null : Number(cell));
    }
  }
  return out;
}

/** Dollars of `year` restated to 2024 dollars with the CPI-U (D-36); a missing figure is no data, never zero. */
export function beaValues(b: Bea, year: number, level: "state" | "county"): Map<string, Value> {
  const cpi = CPI_U[year], rows = b.get(year);
  if (!cpi) throw new Error(`no CPI-U for ${year}: add it to CPI_U in util.ts`);
  if (!rows) throw new Error(`BEA file has no ${year} column`);
  return new Map([...rows].filter(([g]) => g.length === (level === "state" ? 2 : 5))
    .map(([g, v]) => [g, { value: v == null ? null : v * (CPI_U[2024] / cpi), moe: null }]));
}

const UA = { "User-Agent": "Mapwich data ingest (https://mapwich.org; non-commercial)" };
// shortcut: cached once fetched, so a BEA revision is not picked up until data/cache/bea-cainc1.csv is deleted.
const read = async () => parseBea(await remoteZipEntry("https://apps.bea.gov/regional/zip/CAINC1.zip",
  /^CAINC1__ALL_AREAS_\d+_\d+\.csv$/, "bea-cainc1.csv", UA));

export async function ingestBea(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "bea_income" && (!only || only.includes(e.id)));
  if (!entries.length) return;
  const bea = await read(), pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "bea_income") continue;
    await registerDataset(pool, e);
    for (const level of ["state", "county"] as const) {
      const v = beaValues(bea, e.measure.year, level);
      const none = [...v.values()].filter((x) => x.value == null).length;
      if (none) log("bea", `${e.measure.year} ${level}: ${none} with no BEA figure (no data)`);
      await writeValues(pool, e.id, level, v);
    }
  }
  await pool.end();
}

/** Year control (D-36): every year, web export only. */
export async function ingestBeaTimeline(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "bea_income" && e.timeline && (!only || only.includes(e.id)));
  if (!entries.length) return;
  const bea = await read();
  for (const e of entries)
    for (const s of timelineStops(e)) {
      if (s.isDefault) continue;
      for (const level of ["state", "county"] as const) writeStopValues(e.id, s.id, level, beaValues(bea, +s.id, level));
    }
}
