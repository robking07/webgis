// HUD Picture of Subsidized Households (registry `measure.kind: hud_picture`): the "Summary of All
// HUD Programs" row (program 1) of HUD's county and tract workbooks, read with GDAL like ddp287g.
// HUD's codes -1 (missing), -4 (suppressed: fewer than 11 reported families) and -5 (under 50%
// reporting) are no data, never a value. Tract and county codes are 2020 Census geography.
// HUD User's site answers scripted downloads with a bot challenge (HTTP 202, empty body), so the
// workbooks are downloaded in a browser and saved to data/cache under their own names.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { CACHE, db, log, splitCsv, TILES } from "./util.ts";
import { registerDataset, writeValues, type Value } from "./values.ts";
import type { Counts } from "./counts.ts";

type HudMeasure = Extract<DatasetEntry["measure"], { kind: "hud_picture" }>;
type Level = "county" | "tract";

const BASE = "https://www.huduser.gov/portal/datasets/pictures/files/";
const FILES: Record<Level, (y: number) => string[]> = {
  county: (y) => [`COUNTY_${y}_2020census.xlsx`],
  tract: (y) => [`TRACT_AK_MN_${y}_2020census.xlsx`, `TRACT_MO_WY_${y}_2020census.xlsx`],
};
const GEOID = { county: /^\d{5}$/, tract: /^\d{11}$/ } as const;

/** HUD's integer cells: a non-negative number is a value; -1/-4/-5, "NA" and blanks are no data. */
export function hudValue(raw: string | undefined): number | null {
  const n = raw == null || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** geoid → { field → raw text } from ogr2ogr's CSV of program-1 rows. Codes that aren't a county or
 *  tract FIPS (HUD's "Missing" rows such as 27XXX or 27XXX999999) are skipped. */
export function parseHud(csv: string, fields: string[], level: Level): Map<string, Record<string, string>> {
  const [head, ...lines] = csv.trim().split(/\r?\n/);
  const h = splitCsv(head).map((x) => x.toLowerCase());
  const iCode = h.indexOf("code"), cols = fields.map((f) => h.indexOf(f));
  if (iCode < 0 || cols.some((c) => c < 0)) throw new Error(`hud: CSV header [${h.join(", ")}] lacks code or ${fields.join("/")}`);
  const out = new Map<string, Record<string, string>>();
  for (const line of lines) {
    const f = splitCsv(line);
    if (GEOID[level].test(f[iCode])) out.set(f[iCode], Object.fromEntries(fields.map((k, i) => [k, f[cols[i]]])));
  }
  return out;
}

/** Assisted households ÷ renter households × 100; no value when either is missing or there are no renters. */
export function shareOfRenters(assisted: number | null, renters: number | null | undefined): number | null {
  return assisted == null || renters == null || renters <= 0 ? null : (assisted / renters) * 100;
}

function readWorkbook(name: string, fields: string[]): string {
  const path = join(CACHE, name);
  if (!existsSync(path)) {
    throw new Error(`hud: ${name} isn't in data/cache. HUD's site blocks scripted downloads: open ${BASE}${name} in a browser and save it as data/cache/${name}`);
  }
  const r = spawnSync("ogr2ogr", ["-f", "CSV", "/vsistdout/", path, "-select", ["code", ...fields].join(","), "-where", "program = 1"], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ogr2ogr ${name} failed: ${r.stderr.slice(0, 300)}`);
  return r.stdout;
}

/** ACS renter households (the numerator of pct_renter_households' counts) from the local value files. */
function renterHouseholds(level: Level): Map<string, number | null> {
  const out = new Map<string, number | null>();
  // shortcut: reads the published counts files, so data/tiles must be complete (ACS loaded); switch to an ACS API call if this runs on a fresh checkout.
  if (level === "county") {
    const path = join(TILES, "values", "pct_renter_households", "county.counts.json");
    if (!existsSync(path)) throw new Error(`hud: ${path} is missing (run the ACS counts for pct_renter_households first)`);
    for (const [g, c] of Object.entries(JSON.parse(readFileSync(path, "utf8")) as Record<string, Counts>)) out.set(g, c[0]);
    return out;
  }
  const dir = join(TILES, "values", "counts", "tract");
  if (!existsSync(dir)) throw new Error(`hud: ${dir} is missing (data/tiles must be complete)`);
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const rows = (JSON.parse(readFileSync(join(dir, f), "utf8")) as Record<string, Record<string, Counts>>).pct_renter_households ?? {};
    for (const [t, c] of Object.entries(rows)) out.set(f.slice(0, 5) + t, c[0]);
  }
  if (!out.size) throw new Error("hud: no tract counts for pct_renter_households in data/tiles");
  return out;
}

export async function ingestHud(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "hud_picture" && (!only || only.includes(e.id)));
  if (!entries.length) return log("hud", "no hud_picture entries selected");
  const years = new Set(entries.map((e) => (e.measure as HudMeasure).year));
  if (years.size !== 1) throw new Error(`hud entries disagree on year: ${[...years].join(", ")}`);
  const year = [...years][0];
  const fields = [...new Set(entries.map((e) => (e.measure as HudMeasure).field))];
  const pool = db();
  for (const level of ["county", "tract"] as const) {
    const mine = entries.filter((e) => e.geographyLevels.includes(level));
    if (!mine.length) continue;
    const rows = new Map(FILES[level](year).flatMap((name) => [...parseHud(readWorkbook(name, fields), fields, level)]));
    log("hud", `${level}: ${rows.size.toLocaleString()} areas with HUD-assisted housing`);
    const renters = mine.some((e) => (e.measure as HudMeasure).perRenterHouseholds) ? renterHouseholds(level) : null;
    for (const e of mine) {
      const { field, perRenterHouseholds } = e.measure as HudMeasure;
      const values = new Map<string, Value>();
      // moe stays null: HUD counts are administrative records, and the ACS denominator's margin isn't carried.
      for (const [g, r] of rows) {
        const v = hudValue(r[field]);
        values.set(g, { value: perRenterHouseholds ? shareOfRenters(v, renters!.get(g)) : v, moe: null });
      }
      const shown = [...values.values()].filter((v) => v.value != null).length;
      log(e.id, `${level}: ${shown.toLocaleString()} with a value, ${(values.size - shown).toLocaleString()} missing, suppressed or non-reporting`);
      await registerDataset(pool, e);
      await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
