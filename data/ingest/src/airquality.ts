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
import { registerDataset, writeValues, type Value } from "./values.ts";

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

/** County design values from the county-status sheet: finds the header row (the one with "State" and
 *  "County" FIPS columns), then takes the first column whose header mentions the design value for
 *  `year` (e.g. "2023-2025"). Rows without a numeric value (monitor lacks a valid design value) are skipped. */
export function parseCountyDesignValues(rows: string[][], period: string): AirQualityParse {
  const hi = rows.findIndex((r) => r.some((c) => /state\s*fips/i.test(c)) && r.some((c) => /county\s*fips/i.test(c)));
  if (hi < 0) throw new Error("airquality: no header row with State FIPS / County FIPS");
  const header = rows[hi].map((c) => c.replace(/\s+/g, " ").trim());
  const iS = header.findIndex((c) => /state fips/i.test(c)), iC = header.findIndex((c) => /county fips/i.test(c));
  const iV = header.findIndex((c) => /design value/i.test(c) && c.includes(period));
  if (iV < 0) throw new Error(`airquality: no design value column for ${period} in [${header.join(" | ")}]`);
  const values = new Map<string, number>();
  let skipped = 0;
  for (const r of rows.slice(hi + 1)) {
    const s = (r[iS] ?? "").trim(), c = (r[iC] ?? "").trim();
    if (!/^\d{1,2}$/.test(s) || !/^\d{1,3}$/.test(c)) continue; // footnotes, blanks
    const v = Number((r[iV] ?? "").trim());
    if ((r[iV] ?? "").trim() === "" || !Number.isFinite(v) || v <= 0) { skipped++; continue; }
    values.set(s.padStart(2, "0") + c.padStart(3, "0"), Math.round(v * 10000) / 10000);
  }
  return { values, skipped, header };
}

export async function readSheet(path: string, sheetName: string): Promise<string[][]> {
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
