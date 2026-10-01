// ACS 5-year ingest, driven entirely by registry entries with `measure.kind: acs5`.
// Fetches every needed variable (estimate + MOE) in as few API calls as possible,
// then derives each dataset's value and MOE with the Census Bureau's approximation
// formulas (ACS General Handbook, ch. 8).
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { db, log, STATES } from "./util.ts";
import { landArea, registerDataset, writeValues, type Level, type Value } from "./values.ts";

const YEAR = 2024;
const API = `https://api.census.gov/data/${YEAR}/acs/acs5`;
const MAX_VARS = 48;

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

async function fetchTable(vars: string[], geo: string): Promise<Map<string, Row>> {
  const key = process.env.CENSUS_API_KEY;
  if (!key) throw new Error("CENSUS_API_KEY is not set in .env.local (free: https://api.census.gov/data/key_signup.html)");
  const out = new Map<string, Row>();
  for (let i = 0; i < vars.length; i += MAX_VARS) {
    const chunk = vars.slice(i, i + MAX_VARS);
    const url = `${API}?get=${chunk.join(",")}&${geo}&key=${key}`;
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

function derive(entry: DatasetEntry, row: Row, area?: number): Value {
  if (entry.measure.kind !== "acs5") throw new Error("not acs5");
  const { numerator, denominator, scale, perSqMi } = entry.measure;
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

export async function ingestAcs(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "acs5" && (!only || only.includes(e.id)));
  if (!entries.length) return log("acs", "no acs5 entries selected");
  const vars = [...new Set(entries.flatMap((e) => e.measure.kind === "acs5" ? [...e.measure.numerator, ...(e.measure.denominator ?? [])] : []))]
    .flatMap((v) => [`${v}E`, `${v}M`]);
  log("acs", `${entries.length} datasets, ${vars.length} variables`);
  const pool = db();
  for (const e of entries) await registerDataset(pool, e);

  const levels: Array<[Level, () => Promise<Map<string, Row>>]> = [
    ["state", () => fetchTable(vars, "for=state:*")],
    ["county", () => fetchTable(vars, "for=county:*")],
    ["tract", async () => {
      const all = new Map<string, Row>();
      for (const s of Object.keys(STATES)) {
        for (const [k, v] of await fetchTable(vars, `for=tract:*&in=state:${s}`)) all.set(k, v);
      }
      return all;
    }],
  ];
  for (const [level, fetchLevel] of levels) {
    const levelEntries = entries.filter((e) => e.geographyLevels.includes(level));
    if (!levelEntries.length) continue;
    log("acs", `fetching ${level}…`);
    const table = await fetchLevel();
    const areas = await landArea(pool, level);
    for (const e of levelEntries) {
      const values = new Map<string, Value>();
      for (const [geoid, row] of table) values.set(geoid, derive(e, row, areas.get(geoid)));
      await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
