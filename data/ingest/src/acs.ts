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
import { countsSpec, type Relations } from "@webgis/registry/relations";
import { loadRelations } from "@webgis/registry/load";
import { countsRow, remainderRow, sumVars as sum, usArea, writeCounts, writeMoes, writeUs, type Counts, type Row } from "./counts.ts";

const YEAR = ACS_HEADLINE_YEAR;
const API = (year: number) => `https://api.census.gov/data/${year}/acs/acs5`;
const MAX_VARS = 48;
/** CPI-U annual averages (BLS series CUUR0000SA0, period M13). A 5-year estimate's dollars are
 *  its last year's dollars; timeline periods are restated in headline-year dollars (D-36). */
const CPI_U: Record<number, number> = { 2014: 236.736, 2019: 255.657, 2024: 313.689 };


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

/** The numerator and denominator variables of an entry at a level (block groups may use other
 *  tables for the same measure, registry `blockGroup`). */
function tablesOf(entry: DatasetEntry, level?: Level) {
  if (entry.measure.kind !== "acs5") throw new Error("not acs5");
  return level === "block_group" && entry.measure.blockGroup ? entry.measure.blockGroup : entry.measure;
}

/** The counts behind an ACS map (#156): numerator and denominator sums with their margins. */
export function acsCounts(entry: DatasetEntry, row: Row, level?: Level): Counts | null {
  if (!countsSpec(entry)) return null;
  const { numerator, denominator } = tablesOf(entry, level);
  return countsRow(sum(row, numerator), denominator ? sum(row, denominator) : null);
}

export function derive(entry: DatasetEntry, row: Row, area?: number, level?: Level): Value {
  if (entry.measure.kind !== "acs5") throw new Error("not acs5");
  const { scale, perSqMi } = entry.measure;
  const { numerator, denominator } = tablesOf(entry, level);
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

/** Every variable the entries need, plus `extra` (remainder cells); block groups use each entry's
 *  `blockGroup` tables (D-124). */
function varsOf(entries: DatasetEntry[], level?: Level, extra: string[] = []): string[] {
  return [...new Set([...entries.flatMap((e) => {
    if (e.measure.kind !== "acs5") return [];
    const m = tablesOf(e, level);
    return [...m.numerator, ...(m.denominator ?? [])];
  }), ...extra])].flatMap((v) => [`${v}E`, `${v}M`]);
}

/** Parts sets (relations.yaml) whose remainder these entries can give: every member selected. */
function remainderSets(rel: Relations, entries: DatasetEntry[]) {
  const ids = new Set(entries.map((e) => e.id));
  return Object.values(rel.parts).filter((p) => p.remainder && p.members.every((m) => ids.has(m))).map((p) => {
    const members = p.members.map((m) => entries.find((e) => e.id === m)!);
    return { id: p.remainder!.id, variables: p.remainder!.variables, members, total: tablesOf(members[0]).denominator! };
  });
}
type RemainderSet = ReturnType<typeof remainderSets>[number];

/** A parts set's remainder for every place in `table` (total − Σ members, #156). */
export function remainders(set: Pick<RemainderSet, "id" | "variables" | "members" | "total">, table: Map<string, Row>): Map<string, Counts> {
  const out = new Map<string, Counts>();
  let mismatched = 0;
  for (const [g, row] of table) {
    const r = remainderRow(sum(row, set.total), set.members.map((e) => sum(row, tablesOf(e).numerator)), sum(row, set.variables));
    if (r.mismatch) mismatched++;
    out.set(g, r.row);
  }
  if (mismatched) log(set.id, `${mismatched} of ${table.size} places: the remainder's own cells don't equal total − members (check relations.yaml)`);
  return out;
}

/** The U.S. row of every entry (and remainder) for one period: one API call (`for=us:1`, the
 *  Census Bureau's own U.S. estimates and margins, 50 states and DC). `k`: dollar restatement. */
async function writeUsRows(pool: ReturnType<typeof db>, entries: DatasetEntry[], sets: RemainderSet[], vars: string[], year: number, stop: string | null, k: (e: DatasetEntry) => number) {
  const row = [...(await fetchLevel("us", vars, year)).values()][0];
  if (!row) throw new Error(`ACS ${year}: no U.S. row`);
  const area = usArea(await landArea(pool, "state"));
  for (const e of entries) {
    const v = derive(e, row, area), f = k(e);
    writeUs(e.id, stop, { value: v.value == null ? null : v.value * f, moe: v.moe == null ? null : v.moe * f }, acsCounts(e, row));
  }
  for (const s of sets) {
    const c = remainders(s, new Map([["US", row]])).get("US")!;
    writeUs(s.id, stop, { value: c[0] != null && c[2] ? (100 * c[0]) / c[2] : null, moe: null }, c);
  }
}

function fetchLevel(level: Level | "us", vars: string[], year = YEAR): Promise<Map<string, Row>> {
  if (level === "us") return fetchTable(vars, "for=us:1", year);
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
    const k = (e: DatasetEntry) => (e.unit === "dollars" ? CPI_U[YEAR] / cpi : 1);
    await writeUsRows(pool, list.map((x) => x.e), [], vars, year, String(year), k);
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
        const f = k(e);
        for (const [geoid, row] of table) {
          const v = derive(e, row, areas.get(geoid));
          values.set(geoid, { value: v.value == null ? null : v.value * f, moe: v.moe == null ? null : v.moe * f });
        }
        writeStopValues(e.id, String(year), level, values);
        writeMoes(e.id, String(year), level, values); // #154: real margins for the change map
        // shortcut: counts files are written for the default period only (Compare places reads that);
        // write them here too (≈90 MB more on R2) if a change map ever shows change in head counts.
      }
    }
  }
  await pool.end();
}

/** `levelsOnly`: e.g. ["block_group"] for `ingest acs-bg`, without re-fetching the other levels. */
export async function ingestAcs(only?: string[], levelsOnly?: Level[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "acs5" && (!only || only.includes(e.id)));
  if (!entries.length) return log("acs", "no acs5 entries selected");
  // Parts sets with every member selected also get their remainder (#156).
  const sets = remainderSets(loadRelations(), entries);
  const vars = varsOf(entries, undefined, sets.flatMap((s) => s.variables));
  log("acs", `${entries.length} datasets, ${vars.length} variables`);
  const pool = db();
  for (const e of entries) await registerDataset(pool, e);
  if (!levelsOnly || levelsOnly.includes("state")) await writeUsRows(pool, entries, sets, vars, YEAR, null, () => 1);

  for (const level of ["state", "county", "tract", "block_group"] as const) {
    if (levelsOnly && !levelsOnly.includes(level)) continue;
    const levelEntries = entries.filter((e) => e.geographyLevels.includes(level));
    if (!levelEntries.length) continue;
    log("acs", `fetching ${level}…`);
    const levelSets = sets.filter((s) => s.members.every((e) => e.geographyLevels.includes(level)));
    const table = await fetchLevel(level, level === "block_group" ? varsOf(levelEntries, level, levelSets.flatMap((s) => s.variables)) : vars);
    const areas = level === "block_group" ? await blockGroupLandArea() : await landArea(pool, level);
    const counts = new Map<string, Map<string, Counts>>();
    for (const e of levelEntries) {
      const values = new Map<string, Value>();
      for (const [geoid, row] of table) values.set(geoid, derive(e, row, areas.get(geoid), level));
      if (level === "block_group") writeStatic(e.id, level, values); // writes block_group.moe.json too
      else {
        await writeValues(pool, e.id, level, values);
        writeMoes(e.id, null, level, values); // #154: state and county margins were only in details/
      }
      if (countsSpec(e)) counts.set(e.id, new Map([...table].map(([g, row]) => [g, acsCounts(e, row, level)!])));
      // ~240k block groups × 44 series won't fit in memory at once: merge into the shards in batches.
      if (counts.size >= 8) { writeCounts(level, counts); counts.clear(); }
    }
    for (const s of levelSets) counts.set(s.id, remainders(s, table));
    writeCounts(level, counts);
  }
  await pool.end();
}
