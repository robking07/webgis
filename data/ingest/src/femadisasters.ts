// OpenFEMA Disaster Declarations Summaries (registry `measure.kind: fema_declarations`): distinct
// declarations (`disasterNumber`) of the chosen types since a start year, by county and state.
import { readFileSync } from "node:fs";
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, FIPS_RENAMES, log, splitCsv } from "./util.ts";
import { landArea, registerDataset, writeValues, type Value } from "./values.ts";

/** Old Alaska codes FEMA still uses (often for school-district areas) for census areas later split:
 *  a declaration counts toward each successor. */
const SPLITS: Record<string, string[]> = {
  "02261": ["02063", "02066"], // Valdez-Cordova → Chugach + Copper River (2019)
  "02280": ["02195", "02275"], // Wrangell-Petersburg → Petersburg + Wrangell (2008, 2013)
  "02201": ["02198"], // Prince of Wales-Outer Ketchikan → Prince of Wales-Hyder (2008; slivers went elsewhere)
};

/** Distinct declarations per county and per state. One row per declaration per designated area;
 *  county code 000 (statewide, tribal areas) counts toward the state only. Declarations requested
 *  by a tribal government (`tribalRequest` = 1) are left out: they go to the tribe, not the state. */
export function declarationSets(csv: string, types: string[], since: number) {
  const [head, ...lines] = csv.trim().split(/\r?\n/);
  const h = splitCsv(head);
  const col = (n: string) => { const i = h.indexOf(n); if (i < 0) throw new Error(`column ${n} missing`); return i; };
  const iN = col("disasterNumber"), iT = col("declarationType"), iD = col("declarationDate"),
    iTr = col("tribalRequest"), iS = col("fipsStateCode"), iC = col("fipsCountyCode"), iI = h.indexOf("incidentType");
  const out = { state: new Map<string, Set<string>>(), county: new Map<string, Set<string>>() };
  const add = (m: Map<string, Set<string>>, g: string, n: string) => { if (!m.has(g)) m.set(g, new Set()); m.get(g)!.add(n); };
  let tribal = 0;
  for (const line of lines) {
    const f = splitCsv(line);
    if (!types.includes(f[iT]) || !(Number(f[iD].slice(0, 4)) >= since)) continue; // a blank date never counts
    if (f[iI] === "Biological") continue; // pandemic declarations (COVID-19 named every county): left out (Robbie, 2026-10-14)
    if (f[iTr] === "1") { tribal++; continue; }
    const st = f[iS].padStart(2, "0"), raw = st + f[iC].padStart(3, "0"), n = f[iN];
    add(out.state, st, n);
    if (raw.endsWith("000")) continue;
    for (const g of SPLITS[raw] ?? [FIPS_RENAMES[raw] ?? raw]) add(out.county, g, n);
  }
  return { ...out, tribal };
}

export async function ingestFemaDeclarations(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "fema_declarations" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "fema_declarations") continue;
    await registerDataset(pool, e);
    const sets = declarationSets(readFileSync(await cached(e.measure.url, e.measure.file), "utf8"), e.measure.types, e.measure.since);
    log(e.id, `${new Set([...sets.state.values()].flatMap((s) => [...s])).size} declarations since ${e.measure.since} (${sets.tribal} tribal-request rows left out)`);
    for (const level of ["state", "county"] as const) {
      const known = await landArea(pool, level);
      const values = new Map<string, Value>();
      for (const g of known.keys()) {
        // shortcut: FEMA still files Connecticut under its old counties (gone in 2022), so its planning regions get no value; map old counties to regions if FEMA never switches.
        if (level === "county" && g.startsWith("09")) continue;
        values.set(g, { value: sets[level].get(g)?.size ?? 0, moe: null }); // none declared = a real 0
      }
      const unmatched = [...sets[level].keys()].filter((g) => !known.has(g));
      if (unmatched.length) log(e.id, `${level}: ${unmatched.length} codes not in current geography (${unmatched.slice(0, 8).join(", ")})`);
      await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
