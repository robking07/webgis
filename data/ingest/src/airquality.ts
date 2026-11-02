// EPA air quality design values by county, driven by registry entries with `measure.kind: airquality`.
// EPA publishes one workbook per pollutant each spring (public, no key). The county sheet lists the
// design value of the highest valid monitor in each county; counties without a valid monitor are
// absent, so they get no value here (never a zero). We read the .xlsx directly (zip + XML) so no
// spreadsheet package is needed.
import { readFileSync } from "node:fs";
import unzipper from "unzipper";
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { cached, db, log } from "./util.ts";
import { registerDataset, writeStopValues, writeValues, type Value } from "./values.ts";
import { readXlsRows } from "./xls.ts";
import { AIR_FILES } from "./airquality-files.ts";
import { timelineStops } from "@webgis/registry/timeline";

const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&");

/** Shared strings table from an .xlsx `sharedStrings.xml`. */
export function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
}

const colIndex = (ref: string) => [...ref.replace(/\d+$/, "")].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

/** Rows of a worksheet as arrays of strings (numbers kept as their text), blanks as "". */
export function parseSheetRows(xml: string, strings: string[]): string[][] {
  const rows: string[][] = [];
  for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+\d+)"/.exec(c[1])?.[1];
      if (!ref) continue;
      const type = /\bt="(\w+)"/.exec(c[1])?.[1];
      const v = c[2] ? /<v>([\s\S]*?)<\/v>/.exec(c[2])?.[1] : undefined;
      const inl = c[2] ? /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(c[2])?.[1] : undefined;
      row[colIndex(ref)] = type === "s" && v != null ? strings[+v] ?? "" : type === "inlineStr" ? decode(inl ?? "") : decode(v ?? "");
    }
    rows.push(Array.from(row, (x) => x ?? ""));
  }
  return rows;
}

export interface AirQualityParse { values: Map<string, number>; skipped: number; header: string[] }

/** County design values for `period` (e.g. "2023-2025"). Finds the header row (the one with state and county
 *  FIPS columns), then the value column: a header naming the design value and the period, or an older site
 *  listing's `dv2003_2005` / `dva_20032005` (with its `dvstatusas_` column: only 1 and 2 meet completeness).
 *  A county's value is its highest valid row. Rows without a numeric value (no valid design value) are skipped. */
export function parseCountyDesignValues(rows: string[][], period: string): AirQualityParse {
  const clean = (c: string) => c.replace(/\s+/g, " ").trim();
  const isS = (c: string) => /^(state fips|stfips|st)$/i.test(clean(c)), isC = (c: string) => /^(county fips|cntyfips|cou)$/i.test(clean(c));
  const hi = rows.findIndex((r) => r.some(isS) && r.some(isC));
  if (hi < 0) throw new Error("airquality: no header row with State FIPS / County FIPS");
  const header = rows[hi].map(clean);
  const iS = header.findIndex(isS), iC = header.findIndex(isC);
  const [a, b] = period.split("-");
  const iV = header.findIndex((c) => (/design value/i.test(c) && c.includes(period)) || c === `dv${a}_${b}` || c === `dva_${a}${b}`);
  if (iV < 0) throw new Error(`airquality: no design value column for ${period} in [${header.join(" | ")}]`);
  const iT = header.indexOf(`dvstatusas_${a}${b}`);
  const values = new Map<string, number>();
  let skipped = 0;
  for (const r of rows.slice(hi + 1)) {
    const s = (r[iS] ?? "").trim(), c = (r[iC] ?? "").trim();
    if (!/^\d{1,2}$/.test(s) || !/^\d{1,3}$/.test(c)) continue; // footnotes, blanks
    const v = Number((r[iV] ?? "").trim());
    if ((r[iV] ?? "").trim() === "" || !Number.isFinite(v) || v <= 0 || (iT >= 0 && !["1", "2"].includes((r[iT] ?? "").trim()))) { skipped++; continue; }
    const g = s.padStart(2, "0") + c.padStart(3, "0");
    values.set(g, Math.max(values.get(g) ?? 0, Math.round(v * 10000) / 10000));
  }
  return { values, skipped, header };
}

export async function readSheet(path: string, sheetName: string): Promise<string[][]> {
  if (path.endsWith(".xls")) return readXlsRows(path, sheetName);
  const zip = await unzipper.Open.buffer(readFileSync(path));
  const text = async (p: string) => (await zip.files.find((f) => f.path === p)!.buffer()).toString("utf8");
  const wb = await text("xl/workbook.xml");
  const sheet = [...wb.matchAll(/<sheet\b[^>]*>/g)].map((m) => m[0]).find((t) => decode(/\bname="([^"]*)"/.exec(t)?.[1] ?? "") === sheetName);
  if (!sheet) throw new Error(`airquality: no sheet named "${sheetName}"`);
  const rid = /r:id="([^"]+)"/.exec(sheet)![1];
  const rels = await text("xl/_rels/workbook.xml.rels");
  const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((t) => new RegExp(`\\bId="${rid}"`).test(t))!;
  const target = /Target="([^"]+)"/.exec(rel)![1];
  return parseSheetRows(await text("xl/" + target.replace(/^\/?(xl\/)?/, "")), parseSharedStrings(await text("xl/sharedStrings.xml")));
}

export async function ingestAirQuality(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "airquality" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) await one(pool, e);
  await pool.end();
}

async function one(pool: ReturnType<typeof db>, e: DatasetEntry) {
  if (e.measure.kind !== "airquality") return;
  const { url, sheet, period } = e.measure;
  const rows = await readSheet(await cached(url), sheet);
  const { values, skipped, header } = parseCountyDesignValues(rows, period);
  const top = [...values].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g, v]) => `${g} ${v}`).join(", ");
  log(e.id, `${period}: ${values.size} monitored counties (${skipped} without a valid design value skipped); highest ${top}; column "${header.find((c) => /design value/i.test(c) && c.includes(period))}"`);
  await registerDataset(pool, e);
  // Only monitored counties get a row; the rest are "no monitor", not zero. writeValues drops unknown geoids and logs them.
  const out = new Map<string, Value>([...values].map(([g, v]) => [g, { value: v, moe: null }]));
  await writeValues(pool, e.id, "county", out);
}

/** Year control (D-36): every earlier 3-year window, one file per stop (airquality-files.ts), written to the web export only. */
export async function ingestAirQualityTimeline(only?: string[]) {
  for (const e of loadRegistry().filter((e) => e.measure.kind === "airquality" && e.timeline && (!only || only.includes(e.id)))) {
    for (const s of timelineStops(e)) {
      if (s.isDefault) continue;
      const file = AIR_FILES[e.id]?.[+s.id];
      if (!file) throw new Error(`airquality: no EPA workbook listed for ${e.id} ${s.id} (airquality-files.ts)`);
      const [url, sheet] = file;
      const { values } = parseCountyDesignValues(await readSheet(await cached(url), sheet), s.label.replace("–", "-"));
      log(e.id, `${s.label}: ${values.size} monitored counties`);
      writeStopValues(e.id, s.id, "county", new Map([...values].map(([g, v]) => [g, { value: v, moe: null }])));
    }
  }
}
