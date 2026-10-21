// EPA Toxics Release Inventory ingest (registry `measure.kind: tri`): on-site releases in pounds,
// summed by each facility's county and state, ÷ land area. The Basic Data File has county names
// but no FIPS codes, so the codes come from Envirofacts `tri_facility` (no key).
import { readFileSync } from "node:fs";
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, FIPS_RENAMES, log, splitCsv, STATES } from "./util.ts";
import { landArea, registerDataset, writeValues, type Value } from "./values.ts";
import { sumStates, usArea, writeCounts, writeUs, type Counts } from "./counts.ts";

const FACILITY_API = "https://data.epa.gov/efservice/tri_facility";
const PAGE = 10000;

/** TRI facility id → 5-digit county FIPS, from CSV pages of `tri_facility`. */
export function facilityFips(csv: string, out = new Map<string, string>()): Map<string, string> {
  const [head, ...lines] = csv.split(/\r?\n/);
  const h = splitCsv(head), iId = h.indexOf("tri_facility_id"), iF = h.indexOf("state_county_fips_code");
  if (iId < 0 || iF < 0) throw new Error("tri_facility: no tri_facility_id/state_county_fips_code column");
  for (const line of lines) {
    if (!line) continue;
    const f = splitCsv(line);
    if (/^\d{5}$/.test(f[iF])) out.set(f[iId], FIPS_RENAMES[f[iF]] ?? f[iF]);
  }
  return out;
}

// The table also holds contact names, phones and emails: read in memory only, never cached or kept.
async function fetchFacilityFips(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let start = 0; ; start += PAGE) {
    const res = await fetch(`${FACILITY_API}/rows/${start}:${start + PAGE - 1}/csv`);
    if (!res.ok) throw new Error(`tri_facility rows ${start}: ${res.status}`);
    const text = await res.text();
    const before = out.size;
    facilityFips(text, out);
    if (out.size === before || text.split("\n").length <= PAGE) return out;
  }
}

export interface TriTotals { state: Map<string, number>; county: Map<string, number>; pounds: number; facilities: number; noFips: number }

const STATE_OF = new Map(Object.entries(STATES).map(([f, [, usps]]) => [usps, f]));
const key = (s: string) => s.toUpperCase().replace(/\(.*?\)/g, "").replace(/[^A-Z]/g, "");

/** On-site release pounds by state and county from the Basic Data File (rows in grams are dioxins).
 *  The state comes from the row's postal code. `counties` (geoid → "Name, ST") is the current
 *  county list: a facility whose code isn't in it (EPA writes 00000 for a few Alaska boroughs) is
 *  matched by the file's county name, which EPA cuts to 25 letters, so a prefix match. */
export function triTotals(csv: string, fips: Map<string, string>, counties = new Map<string, string>()): TriTotals {
  const [head, ...lines] = csv.split(/\r?\n/);
  const h = splitCsv(head);
  const col = (name: string) => { const i = h.indexOf(name); if (i < 0) throw new Error(`TRI file: no "${name}" column`); return i; };
  const iId = col("2. TRIFD"), iCty = col("7. COUNTY"), iSt = col("8. ST"), iUnit = col("50. UNIT OF MEASURE"), iOn = col("65. ON-SITE RELEASE TOTAL");
  const byName = [...counties].map(([g, n]) => [g, n.slice(-2), key(n.slice(0, -4))] as const);
  const t: TriTotals = { state: new Map(), county: new Map(), pounds: 0, facilities: 0, noFips: 0 };
  const seen = new Set<string>();
  for (const line of lines) {
    if (!line) continue;
    const f = splitCsv(line);
    if (f[iUnit] !== "Pounds") continue;
    const lb = Number(f[iOn]) || 0, id = f[iId], st = STATE_OF.get(f[iSt]);
    let g = fips.get(id);
    if (counties.size && (!g || !counties.has(g))) {
      const name = key(f[iCty]);
      g = (name && byName.find(([, s, n]) => s === f[iSt] && n.startsWith(name))?.[0]) || g;
    }
    t.pounds += lb;
    if (!seen.has(id)) { seen.add(id); t.facilities++; }
    if (st) t.state.set(st, (t.state.get(st) ?? 0) + lb); // territories other than PR aren't mapped
    if (!g) { t.noFips += lb; continue; }
    t.county.set(g, (t.county.get(g) ?? 0) + lb);
  }
  return t;
}

/** Pounds per square mile for every known place (no reporting facility = 0). A state whose pounds
 *  are more than 5% under county codes not in the boundaries (Connecticut's pre-2022 counties) gets
 *  no county values, so its counties don't read falsely low. */
export function triValues(pounds: Map<string, number>, areas: Map<string, number>): Map<string, Value> {
  const values = new Map<string, Value>();
  for (const [g, a] of areas) values.set(g, { value: a > 0 ? (pounds.get(g) ?? 0) / a : null, moe: null });
  const lost = new Map<string, number>(), all = new Map<string, number>();
  for (const [g, lb] of pounds) {
    const st = g.slice(0, 2);
    all.set(st, (all.get(st) ?? 0) + lb);
    if (!areas.has(g)) lost.set(st, (lost.get(st) ?? 0) + lb);
  }
  for (const [st, lb] of lost) if (lb > 0.05 * all.get(st)!) for (const g of values.keys()) if (g.length > 2 && g.startsWith(st)) values.set(g, { value: null, moe: null });
  return values;
}

export async function ingestTri(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "tri" && (!only || only.includes(e.id)));
  if (!entries.length) return;
  const pool = db();
  const fips = await fetchFacilityFips();
  log("tri", `${fips.size.toLocaleString()} facilities with a county code`);
  const { rows } = await pool.query<{ geoid: string; name: string }>("select geoid, name from public.geographies where level = 'county'");
  const counties = new Map(rows.map((r) => [r.geoid, r.name]));
  for (const e of entries) {
    if (e.measure.kind !== "tri") continue;
    await registerDataset(pool, e);
    const t = triTotals(readFileSync(await cached(e.measure.url, e.measure.file), "utf8"), fips, counties);
    log(e.id, `${e.measure.year}: ${Math.round(t.pounds).toLocaleString()} lb on site from ${t.facilities.toLocaleString()} facilities (${Math.round(t.noFips).toLocaleString()} lb without a county code)`);
    for (const level of e.geographyLevels) {
      if (level !== "state" && level !== "county") continue;
      const areas = await landArea(pool, level);
      const values = triValues(t[level], areas);
      const unmatched = [...t[level].keys()].filter((g) => !areas.has(g));
      if (unmatched.length) log(e.id, `${level}: ${unmatched.length} codes not in current geography (${unmatched.slice(0, 5).join(", ")})`);
      await writeValues(pool, e.id, level, values);
      // The counts behind the map (#156): pounds released on site, where the map has a value.
      const rows = new Map([...values].map(([g, v]): [string, Counts] => [g, [v.value == null ? null : Math.round(t[level].get(g) ?? 0), null, null, null]]));
      writeCounts(level, new Map([[e.id, rows]]));
      if (level === "state") { const us = sumStates(rows); writeUs(e.id, null, { value: us[0] == null ? null : us[0] / usArea(areas), moe: null }, us); }
    }
  }
  await pool.end();
}
