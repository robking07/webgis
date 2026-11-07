// FHFA annual House Price Index (public domain): a repeat-sales index of homes with mortgages bought
// or guaranteed by Fannie Mae and Freddie Mac, by state (from 1975) and county (from 1986, which FHFA
// calls "developmental"). One public workbook per level, no key. The index is relative to an arbitrary
// first year, so the map shows the % change over the 10 years to each year. Registry `measure.kind: fhfa_hpi` (#518).
import { loadRegistry } from "@webgis/registry/load";
import { timelineStops } from "@webgis/registry/timeline";
import { cached, db, log } from "./util.ts";
import { readSheet } from "./airquality.ts";
import { registerDataset, writeStopValues, writeValues, type Value } from "./values.ts";

/** FIPS ("27", "27053") → year → index. */
export type Hpi = Map<string, Map<number, number>>;

/** Years the change looks back. */
export const SPAN = 10;

/** The sheet's rows below its title block: finds the header row (State … FIPS … Year … HPI), then reads
 *  FIPS, year and the continuous "HPI" column (not the 1990/2000-base columns, which are blank early).
 *  Rows with no index (too few sales) are skipped, so those places and years show no data. */
export function parseHpi(rows: string[][]): Hpi {
  const hi = rows.findIndex((r) => /^state$/i.test(r[0]?.trim()) && r.some((c) => /^year$/i.test(c.trim())));
  if (hi < 0) throw new Error("FHFA HPI: no header row");
  const h = rows[hi].map((c) => c.trim());
  const [iF, iY, iH] = [h.findIndex((c) => /^fips/i.test(c)), h.indexOf("Year"), h.indexOf("HPI")];
  if (iF < 0 || iY < 0 || iH < 0) throw new Error(`FHFA HPI: unexpected header [${h.join(" | ")}]`);
  const out: Hpi = new Map();
  for (const r of rows.slice(hi + 1)) {
    const f = (r[iF] ?? "").trim(), y = Number(r[iY]), v = Number(r[iH]);
    if (!/^\d{2}(\d{3})?$/.test(f) || !Number.isInteger(y) || !(v > 0)) continue; // footnotes, blanks, no index
    if (!out.has(f)) out.set(f, new Map());
    out.get(f)!.set(y, v);
  }
  return out;
}

/** % change in the index from `year - SPAN` to `year`; a place missing either year has no value. */
export function hpiChange(hpi: Hpi, year: number): Map<string, Value> {
  const out = new Map<string, Value>();
  for (const [g, s] of hpi) {
    const a = s.get(year - SPAN), b = s.get(year);
    if (a && b) out.set(g, { value: (b / a - 1) * 100, moe: null });
  }
  return out;
}

// FHFA replaces these files in place each spring; the file name carries the release so an older copy
// stays in data/cache (handbook §2). Bump RELEASE with the sheet's "Last updated" date.
const RELEASE = "2026-03-31";
const BASE = "https://www.fhfa.gov/hpi/download/annual";
const memo = new Map<string, Hpi>();
async function load(level: "state" | "county"): Promise<Hpi> {
  if (!memo.has(level)) memo.set(level, parseHpi(await readSheet(await cached(`${BASE}/hpi_at_${level}.xlsx`, `fhfa-hpi-${level}-${RELEASE}.xlsx`), level)));
  return memo.get(level)!;
}

export async function ingestFhfa(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "fhfa_hpi" && (!only || only.includes(e.id)));
  if (!entries.length) return;
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "fhfa_hpi") continue;
    await registerDataset(pool, e);
    for (const level of ["state", "county"] as const) {
      const v = hpiChange(await load(level), e.measure.year);
      log(e.id, `${e.measure.year} ${level}: ${v.size} of ${(await load(level)).size} places have an index for both years`);
      await writeValues(pool, e.id, level, v);
    }
  }
  await pool.end();
}

/** Year control (D-36): every year with a 10-year look-back, web export only. */
export async function ingestFhfaTimeline(only?: string[]) {
  for (const e of loadRegistry().filter((e) => e.measure.kind === "fhfa_hpi" && e.timeline && (!only || only.includes(e.id)))) {
    for (const s of timelineStops(e)) {
      if (s.isDefault) continue;
      for (const level of ["state", "county"] as const) writeStopValues(e.id, s.id, level, hpiChange(await load(level), +s.id));
    }
  }
}
