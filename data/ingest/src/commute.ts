// Commute flows (#469): for every county, where its workers live and where its residents work, from
// the LODES 8 origin-destination files (all jobs, JT00). Not a registry dataset: one national file.
//   npm run ingest -- commute          reads each state's od `main` (lives and works in the state) and
//                                      `aux` (works in the state, lives in another) files, sums block
//                                      pairs to county pairs, writes data/tiles/commute/commute.json
//   npm run ingest -- publish-commute  uploads it to R2, where the place page and the map read it
//   COMMUTE_STATES=MN,WA npm run ingest -- commute   a few states only (local checks)
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { loadRegistry } from "@webgis/registry/load";
import { stateFile, xwalk } from "./lodes.ts";
import { log, STATES, TILES } from "./util.ts";

export const COMMUTE_JSON = join(TILES, "commute/commute.json");
const TOP = 10;

/** [county, jobs] */
export type Flow = [string, number];
/** Per county: [jobs located there (workers), jobs held by its residents, jobs held by residents of the
 *  same county, top home counties of its workers, top work counties of its residents]. */
export type CountyFlows = [number, number, number, Flow[], Flow[]];
export interface Commute { year: number; years: Record<string, number>; counties: Record<string, CountyFlows> }

/** Adds one OD file's rows (w_geocode,h_geocode,S000,…) to `pairs`, keyed work county + home county.
 *  `county` turns a block code into its current county code (Connecticut's blocks need the crosswalk). */
export async function addPairs(lines: AsyncIterable<string> | Iterable<string>, pairs: Map<string, number>, county: (block: string) => string) {
  let header = true;
  for await (const line of lines) {
    if (header) { header = false; continue; }
    const [w, h, n] = line.split(",", 3);
    const k = county(w) + county(h);
    pairs.set(k, (pairs.get(k) ?? 0) + +n);
  }
}

const top = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).slice(0, TOP);

/** County pairs → each county's totals, same-county jobs (before the top-10 cut) and top flows.
 *  Counties in `skip` (states with no file) get no entry: their own numbers would be incomplete. */
export function summarize(pairs: Map<string, number>, skip: Set<string> = new Set()): Record<string, CountyFlows> {
  const live = new Map<string, Map<string, number>>(), work = new Map<string, Map<string, number>>();
  const add = (m: Map<string, Map<string, number>>, a: string, b: string, n: number) => {
    if (skip.has(a.slice(0, 2))) return;
    const inner = m.get(a) ?? m.set(a, new Map()).get(a)!;
    inner.set(b, (inner.get(b) ?? 0) + n);
  };
  for (const [k, n] of pairs) { const w = k.slice(0, 5), h = k.slice(5); add(live, w, h, n); add(work, h, w, n); }
  const sum = (m?: Map<string, number>) => [...(m ?? [])].reduce((a, [, n]) => a + n, 0);
  const out: Record<string, CountyFlows> = {};
  for (const c of [...new Set([...live.keys(), ...work.keys()])].sort()) {
    const l = live.get(c), r = work.get(c);
    const same = l?.get(c) ?? 0;
    const others = (m?: Map<string, number>) => top(new Map([...(m ?? [])].filter(([g]) => g !== c)));
    out[c] = [sum(l), sum(r), same, others(l), others(r)];
  }
  return out;
}

const lines = (path: string) => createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });

export async function commuteOut() {
  // The registry's LODES vintage (job_density), so both move together.
  const YEAR = +loadRegistry().find((e) => e.measure.kind === "lodes")!.vintage;
  const only = process.env.COMMUTE_STATES?.split(",").map((s) => s.trim().toUpperCase());
  // Connecticut's OD blocks carry the old county codes in every state's files (aux rows too).
  const ct = await xwalk("ct", "cty");
  const county = (b: string) => {
    if (!b.startsWith("09")) return b.slice(0, 5);
    const c = ct.get(b);
    if (!c) throw new Error(`commute: Connecticut block ${b} not in ct_xwalk`);
    return c;
  };
  const pairs = new Map<string, number>();
  const years: Record<string, number> = {};
  const missing = new Set<string>();
  for (const [fips, [, usps]] of Object.entries(STATES)) {
    if (fips === "72" || (only && !only.includes(usps))) continue; // LODES does not cover Puerto Rico
    const st = usps.toLowerCase();
    const main = await stateFile(st, "od", "main", "JT00", YEAR, 3);
    if (!main) { missing.add(fips); log("commute", `${usps}: no od file since ${YEAR - 3}`); continue; }
    if (main.year !== YEAR) years[fips] = main.year;
    const aux = await stateFile(st, "od", "aux", "JT00", main.year, 0);
    if (!aux) throw new Error(`commute: ${usps} has od main ${main.year} but no aux`);
    await addPairs(lines(main.path), pairs, county);
    await addPairs(lines(aux.path), pairs, county);
    log("commute", `${usps} ${main.year}: ${pairs.size.toLocaleString()} county pairs so far`);
  }
  if (only) for (const fips of Object.keys(STATES)) if (!only.includes(STATES[fips][1])) missing.add(fips);
  const out: Commute = { year: YEAR, years, counties: summarize(pairs, missing) };
  mkdirSync(dirname(COMMUTE_JSON), { recursive: true });
  writeFileSync(COMMUTE_JSON, JSON.stringify(out));
  log("commute", `${Object.keys(out.counties).length} counties → ${COMMUTE_JSON}`);
}
