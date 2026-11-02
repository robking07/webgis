// Census county population estimates, July 1 of each year 1970–2019, for the years before ACS
// (FARS history, #479). One public file per era, each keyed to that era's county codes; no key needed.
import { readFileSync } from "node:fs";
import { cached, FIPS_RENAMES, splitCsv } from "./util.ts";
import { areas2019 } from "./geographies.ts";

const BASE = "https://www2.census.gov/programs-surveys/popest";
/** year → county FIPS (as the file coded it) → residents */
export type Pops = Map<number, Map<string, number>>;

const put = (out: Pops, year: number, fips: string, n: number) => {
  if (!Number.isFinite(n)) throw new Error(`population estimate ${year} ${fips}: not a number`);
  if (!out.has(year)) out.set(year, new Map());
  out.get(year)!.set(fips, n);
};

/** 1970s and 1980s tables: blocks of five years, each introduced by a "Code  Area Name  1975 …" row. */
export function parseDecadeText(text: string, out: Pops = new Map()): Pops {
  let years: number[] = [], carry = "";
  for (let line of text.split(/\r?\n/)) {
    if (/^Code\s+Area Name/.test(line)) { years = (line.match(/\b19\d\d\b/g) ?? []).map(Number); continue; }
    if (carry) { line = `${carry} ${line.trim()}`; carry = ""; } // a long county name wraps; its numbers are on the next line
    else if (/^\d{5} /.test(line) && !/\d\s*$/.test(line)) { carry = line.trim(); continue; }
    const m = /^(\d{5}) /.exec(line);
    if (!m || m[1].endsWith("000") || !years.length) continue; // state and U.S. rows: we sum counties
    const nums = line.trim().split(/\s+/).slice(-years.length);
    years.forEach((y, i) => put(out, y, m[1], Number(nums[i])));
  }
  return out;
}

/** 1990s table (CO-99-8): block 1 is total population, columns 1999 down to 1990 then the 1990 base. */
export function parse1990s(text: string, out: Pops = new Map()): Pops {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim().split(/\s+/);
    if (t[0] !== "1" || !/^\d{5}$/.test(t[1] ?? "")) continue;
    // Fixed width (a garbled byte can split a cell in two): 8 characters of block and code, 13 for 1999, then 12 per year.
    const n = Array.from({ length: 10 }, (_, i) => Number(line.slice(i ? 9 + 12 * i : 8, 21 + 12 * i).replace(/,/g, "")));
    // The file has two garbled cells (Sevier Co., UT, 1994; Windsor Co., VT, 1993–94): fill with a straight line between the years either side.
    for (let i = 1; i < 9; i++) {
      if (Number.isFinite(n[i])) continue;
      let j = i; while (j < 9 && !Number.isFinite(n[j])) j++;
      for (let k = i; k < j; k++) n[k] = n[i - 1] + ((n[j] - n[i - 1]) * (k - i + 1)) / (j - i + 1);
    }
    n.forEach((v, i) => put(out, 1999 - i, t[1], v));
  }
  return out;
}

/** 2000s and 2010s files: one county row per place, a POPESTIMATE<year> column per year. */
export function parseCsv(text: string, from: number, to: number, out: Pops = new Map()): Pops {
  const lines = text.split(/\r?\n/);
  const h = splitCsv(lines[0]);
  const iS = h.indexOf("STATE"), iC = h.indexOf("COUNTY"), iL = h.indexOf("SUMLEV");
  const col = (y: number) => h.indexOf(`POPESTIMATE${y}`);
  for (let y = from; y <= to; y++) if (col(y) < 0 || iS < 0 || iC < 0) throw new Error(`population file: no POPESTIMATE${y} / STATE / COUNTY column`);
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const f = splitCsv(line);
    if (Number(f[iL]) !== 50) continue; // county rows only
    for (let y = from; y <= to; y++) put(out, y, f[iS].padStart(2, "0") + f[iC].padStart(3, "0"), Number(f[col(y)]));
  }
  return out;
}

let all: Promise<Pops> | undefined;
function load(): Promise<Pops> {
  all ??= (async () => {
    const read = async (path: string) => readFileSync(await cached(`${BASE}/${path}`), "latin1");
    const out: Pops = new Map();
    parseDecadeText(await read("tables/1900-1980/counties/totals/e7079co.txt"), out);
    parseDecadeText(await read("tables/1980-1990/counties/totals/e8089co.txt"), out);
    parse1990s(await read("tables/1990-2000/counties/totals/99c8_00.txt"), out);
    parseCsv(await read("datasets/2000-2010/intercensal/county/co-est00int-tot.csv"), 2000, 2009, out);
    parseCsv(await read("datasets/2010-2019/counties/totals/co-est2019-alldata.csv"), 2010, 2019, out);
    return out;
  })();
  return all;
}

/** Residents of one year, 1975–2019, on 2019 boundaries: the codes FARS used that year are carried
 *  to the 2019 ones (FIPS_RENAMES: Dade → Miami-Dade, towns merged into Virginia counties), and
 *  counties that no longer exist are dropped from the county map but still count in their state. */
export async function estimatedPop(year: number, level: "state" | "county"): Promise<Map<string, number>> {
  const raw = (await load()).get(year);
  if (!raw?.size) throw new Error(`no Census population estimates for ${year}`);
  const county = new Map<string, number>();
  for (const [f, n] of raw) { const g = FIPS_RENAMES[f] ?? f; county.set(g, (county.get(g) ?? 0) + n); }
  const out = new Map<string, number>();
  if (level === "state") {
    for (const [g, n] of county) if (!g.startsWith("72")) out.set(g.slice(0, 2), (out.get(g.slice(0, 2)) ?? 0) + n);
    return out;
  }
  const valid = await areas2019("county");
  for (const [g, n] of county) if (valid.has(g)) out.set(g, n);
  return out;
}
