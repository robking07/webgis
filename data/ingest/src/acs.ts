// ACS 5-year ingest, driven entirely by registry entries with `measure.kind: acs5`.
// Fetches every needed variable (estimate + MOE) in as few API calls as possible,
// then derives each dataset's value and MOE with the Census Bureau's approximation
// formulas (ACS General Handbook, ch. 8).
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { ACS_HEADLINE_YEAR, timelineStops } from "@webgis/registry/timeline";
import { db, FIPS_RENAMES, log, STATES } from "./util.ts";
import { areas2019, blockGroupLandArea } from "./geographies.ts";
import { landArea, registerDataset, writeStatic, writeStopValues, writeValues, type Level, type Value } from "./values.ts";

const YEAR = ACS_HEADLINE_YEAR;
const API = (year: number) => `https://api.census.gov/data/${year}/acs/acs5`;
const MAX_VARS = 48;
/** CPI-U annual averages (BLS series CUUR0000SA0, period M13). A 5-year estimate's dollars are
 *  its last year's dollars; timeline periods are restated in headline-year dollars (D-36). */
const CPI_U: Record<number, number> = { 2014: 236.736, 2019: 255.657, 2024: 313.689 };

type Row = Map<string, number | null>; // variable (with E/M suffix) → number

function clean(raw: string | null, isMoe: boolean): number | null {
  if (raw == null) return null;
  const v = Number(raw);
  if (!Number.isFinite(v)) return null;
  // Annotation sentinels: -555555555 = controlled (MOE 0); other large negatives = not available.
  if (v === -555555555) return isMoe ? 0 : null;
  if (v <= -222222222) return null;
  return v;
}

async function fetchTable(vars: string[], geo: string, year = YEAR): Promise<Map<string, Row>> {
  const key = process.env.CENSUS_API_KEY;
  if (!key) throw new Error("CENSUS_API_KEY is not set in .env.local (free: https://api.census.gov/data/key_signup.html)");
  const out = new Map<string, Row>();
  for (let i = 0; i < vars.length; i += MAX_VARS) {
    const chunk = vars.slice(i, i + MAX_VARS);
    const url = `${API(year)}?get=${chunk.join(",")}&${geo}&key=${key}`;
    let res: Response | undefined;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await fetch(url, { redirect: "manual" });
      if (res.status === 200) break;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
    if (!res || res.status !== 200) throw new Error(`ACS ${geo} → ${res?.status} ${res?.headers.get("location") ?? ""}`);
    const [head, ...rows] = (await res.json()) as string[][];
    const geoCols = head.filter((h) => !chunk.includes(h));
    for (const r of rows) {
      const rec = Object.fromEntries(head.map((h, j) => [h, r[j]]));
      const geoid = geoCols.map((g) => rec[g]).join("");
      const row = out.get(geoid) ?? new Map();
      for (const v of chunk) row.set(v, clean(rec[v], v.endsWith("M")));
      out.set(geoid, row);
    }
  }
  return out;
}

function sum(row: Row, vars: string[]): { e: number | null; m: number | null } {
  let e = 0, m2 = 0;
  for (const v of vars) {
    const ev = row.get(`${v}E`), mv = row.get(`${v}M`);
    if (ev == null) return { e: null, m: null };
    e += ev;
    m2 += (mv ?? 0) ** 2;
  }
  return { e, m: Math.sqrt(m2) };
}

function derive(entry: DatasetEntry, row: Row, area?: number, level?: Level): Value {
  if (entry.measure.kind !== "acs5") throw new Error("not acs5");
  const { scale, perSqMi } = entry.measure;
  // Block groups may use other tables for the same measure (registry `blockGroup`).
  const { numerator, denominator } = level === "block_group" && entry.measure.blockGroup ? entry.measure.blockGroup : entry.measure;
  const num = sum(row, numerator);
  if (num.e == null) return { value: null, moe: null };
  let value = num.e, moe = num.m;
  if (denominator) {
    const den = sum(row, denominator);
    if (den.e == null || den.e === 0) return { value: null, moe: null };
    const r = num.e / den.e;
    // Proportion formula when the numerator is a subset of the denominator (percent units); else ratio formula.
    const isProportion = entry.unit === "percent";
    let rad = (num.m ?? 0) ** 2 + (isProportion ? -1 : 1) * r * r * (den.m ?? 0) ** 2;
    if (rad < 0) rad = (num.m ?? 0) ** 2 + r * r * (den.m ?? 0) ** 2;
    value = r;
    moe = Math.sqrt(rad) / den.e;
  }
  if (perSqMi) {
    if (!area) return { value: null, moe: null };
    value /= area;
    moe = moe == null ? null : moe / area;
  }
  return { value: value * scale, moe: moe == null ? null : moe * scale };
}

/** Every variable the entries need; block groups use each entry's `blockGroup` tables (D-124). */
function varsOf(entries: DatasetEntry[], level?: Level): string[] {
  return [...new Set(entries.flatMap((e) => {
    if (e.measure.kind !== "acs5") return [];
    const m = level === "block_group" && e.measure.blockGroup ? e.measure.blockGroup : e.measure;
    return [...m.numerator, ...(m.denominator ?? [])];
  }))].flatMap((v) => [`${v}E`, `${v}M`]);
}

function fetchLevel(level: Level, vars: string[], year = YEAR): Promise<Map<string, Row>> {
  if (level === "state") return fetchTable(vars, "for=state:*", year);
  if (level === "county") return fetchTable(vars, "for=county:*", year);
  // Tracts and block groups: one call per state (block groups across every county and tract).
  const geo = level === "block_group" ? "for=block%20group:*&in=state:{s}&in=county:*&in=tract:*" : "for=tract:*&in=state:{s}";
  return (async () => {
    const all = new Map<string, Row>();
    for (const s of Object.keys(STATES)) for (const [k, v] of await fetchTable(vars, geo.replace("{s}", s), year)) all.set(k, v);
    return all;
  })();
}

/** Earlier 5-year periods for the year control (D-36), written to the web export only.
 *  Periods before 2020 are keyed to 2019 boundaries (2010 tracts); the 2010–2014 county
 *  codes renamed in 2015 are carried forward to match them. */
export async function ingestAcsTimeline(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "acs5" && e.timeline && (!only || only.includes(e.id)));
  const byYear = new Map<number, Array<{ e: DatasetEntry; boundaries?: "2019" }>>();
  for (const e of entries) for (const s of timelineStops(e)) {
    if (s.isDefault) continue;
    (byYear.get(+s.id) ?? byYear.set(+s.id, []).get(+s.id)!).push({ e, boundaries: s.boundaries });
  }
  if (!byYear.size) return log("acs", "no acs5 timeline periods selected");
  const pool = db();
  for (const [year, list] of [...byYear].sort((a, b) => a[0] - b[0])) {
    const cpi = CPI_U[year];
    if (list.some(({ e }) => e.unit === "dollars") && !cpi) throw new Error(`no CPI-U for ${year}: add it to CPI_U in acs.ts`);
    const boundaries = list[0].boundaries;
    const vars = varsOf(list.map((x) => x.e));
    log("acs", `${year - 4}–${year}: ${list.length} datasets, ${vars.length} variables${boundaries ? `, ${boundaries} boundaries` : ""}`);
    for (const level of ["state", "county", "tract"] as const) {
      const levelEntries = list.map((x) => x.e).filter((e) => e.geographyLevels.includes(level));
      if (!levelEntries.length) continue;
      log("acs", `fetching ${year} ${level}…`);
      const raw = await fetchLevel(level, vars, year);
      const table = new Map<string, Row>();
      for (const [g, row] of raw) {
        const fixed = level === "state" || !boundaries ? g : (FIPS_RENAMES[g.slice(0, 5)] ?? g.slice(0, 5)) + g.slice(5);
        table.set(fixed, row);
      }
      const areas = level !== "state" && boundaries ? await areas2019(level) : await landArea(pool, level);
      for (const e of levelEntries) {
        const values = new Map<string, Value>();
        const k = e.unit === "dollars" ? CPI_U[YEAR] / cpi : 1;
        for (const [geoid, row] of table) {
          const v = derive(e, row, areas.get(geoid));
          values.set(geoid, { value: v.value == null ? null : v.value * k, moe: v.moe == null ? null : v.moe * k });
        }
        writeStopValues(e.id, String(year), level, values);
      }
    }
  }
  await pool.end();
}

/** `levelsOnly`: e.g. ["block_group"] for `ingest acs-bg`, without re-fetching the other levels. */
export async function ingestAcs(only?: string[], levelsOnly?: Level[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "acs5" && (!only || only.includes(e.id)));
  if (!entries.length) return log("acs", "no acs5 entries selected");
  const vars = varsOf(entries);
  log("acs", `${entries.length} datasets, ${vars.length} variables`);
  const pool = db();
  for (const e of entries) await registerDataset(pool, e);

  for (const level of ["state", "county", "tract", "block_group"] as const) {
    if (levelsOnly && !levelsOnly.includes(level)) continue;
    const levelEntries = entries.filter((e) => e.geographyLevels.includes(level));
    if (!levelEntries.length) continue;
    log("acs", `fetching ${level}…`);
    const table = await fetchLevel(level, level === "block_group" ? varsOf(entries, level) : vars);
    const areas = level === "block_group" ? await blockGroupLandArea() : await landArea(pool, level);
    for (const e of levelEntries) {
      const values = new Map<string, Value>();
      for (const [geoid, row] of table) values.set(geoid, derive(e, row, areas.get(geoid), level));
      if (level === "block_group") writeStatic(e.id, level, values);
      else await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
