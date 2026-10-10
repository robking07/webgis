// 2020 Census counts (P.L. 94-171), built from blocks up (D-124). For each state: block
// counts from the Census API (population, housing units, vacant units) are joined to the
// TIGER/Line 2020 block shapes (land area). Blocks are summed into block groups, tracts,
// counties and states, so every level adds up; Connecticut's 2020 blocks are re-keyed to
// its current planning-region tracts through the LODES crosswalk (as in lodes.ts).
// Block values are written into the block tiles; block groups go to static files (too many
// for the database); states, counties and tracts go to the database like any dataset.
import { spawnSync } from "node:child_process";
import { createReadStream, createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { join } from "node:path";
import { loadRegistry } from "@webgis/registry/load";
import { cached, CACHE, db, log, splitCsv, STATES, TILES } from "./util.ts";
import { isCountsOnly, registerDataset, writeStatic, writeValues, type Level, type Value } from "./values.ts";
import { writeCounts, writeUs, type Counts } from "./counts.ts";

const API = "https://api.census.gov/data/2020/dec/pl";
const SQMI = 2_589_988.11;
type Totals = { pop: number; hu: number; vac: number; aland: number };
const LEN: Record<Exclude<Level, "block">, number> = { state: 2, county: 5, tract: 11, block_group: 12 };

/** pop, housing units, vacant units for every block in a state. */
async function blockCounts(st: string): Promise<Map<string, [number, number, number]>> {
  const key = process.env.CENSUS_API_KEY;
  if (!key) throw new Error("CENSUS_API_KEY is not set in .env.local");
  const url = `${API}?get=P1_001N,H1_001N,H1_003N&for=block:*&in=state:${st}&in=county:*&in=tract:*&key=${key}`;
  let res: Response | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch(url, { redirect: "manual" });
    if (res.status === 200) break;
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
  if (!res || res.status !== 200) throw new Error(`2020 PL blocks for ${st} → ${res?.status}`);
  const [, ...rows] = (await res.json()) as string[][];
  return new Map(rows.map((r) => [r[3] + r[4] + r[5] + r[6], [+r[0], +r[1], +r[2]]]));
}

/** Connecticut: 2020 block → [current tract, current block group]. */
async function ctCrosswalk(): Promise<Map<string, [string, string]>> {
  const rl = createInterface({ input: createReadStream(await cached("https://lehd.ces.census.gov/data/lodes/LODES8/ct/ct_xwalk.csv.gz")).pipe(createGunzip()) });
  let iBlk = -1, iTrct = -1, iBg = -1;
  const out = new Map<string, [string, string]>();
  for await (const line of rl) {
    const p = splitCsv(line);
    if (iBlk < 0) { iBlk = p.indexOf("tabblk2020"); iTrct = p.indexOf("trct"); iBg = p.indexOf("bgrp"); continue; }
    out.set(p[iBlk], [p[iTrct], p[iBg]]);
  }
  return out;
}

const round = (v: number) => Number(v.toPrecision(3));
function derive(t: Totals): Record<"pop_density" | "hu_density" | "pct_vacant", number | null> {
  const sqmi = t.aland / SQMI;
  return {
    pop_density: sqmi > 0 ? t.pop / sqmi : null,
    hu_density: sqmi > 0 ? t.hu / sqmi : null,
    pct_vacant: t.hu > 0 ? (100 * t.vac) / t.hu : null,
  };
}

/** The counts behind each 2020 Census map (#156): full counts, so no margins. */
export function census2020Counts(value: "pop_density" | "hu_density" | "pct_vacant", t: Totals): Counts {
  if (value === "pop_density") return [t.pop, null, null, null];
  if (value === "hu_density") return [t.hu, null, null, null];
  return [t.vac, null, t.hu, null];
}

export async function ingestCensus2020(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "census2020" && (!only || only.includes(e.id)));
  if (!entries.length) return log("census2020", "no census2020 entries selected");
  const work = join(CACHE, "census2020");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const blocksOut = join(work, "block.geojsonl");
  const out = createWriteStream(blocksOut);
  const totals: Record<Exclude<Level, "block">, Map<string, Totals>> = { state: new Map(), county: new Map(), tract: new Map(), block_group: new Map() };
  const add = (lvl: keyof typeof totals, key: string, pop: number, hu: number, vac: number, aland: number) => {
    const t = totals[lvl].get(key) ?? { pop: 0, hu: 0, vac: 0, aland: 0 };
    t.pop += pop; t.hu += hu; t.vac += vac; t.aland += aland;
    totals[lvl].set(key, t);
  };
  const ct = await ctCrosswalk();
  let blocks = 0;

  for (const [st, [name, usps]] of Object.entries(STATES)) {
    const counts = await blockCounts(st);
    const zip = await cached(`https://www2.census.gov/geo/tiger/TIGER2020/TABBLOCK20/tl_2020_${st}_tabblock20.zip`);
    const seq = join(work, `${st}.geojsonl`);
    const g = spawnSync("ogr2ogr", ["-f", "GeoJSONSeq", seq, `/vsizip/${zip}`, "-sql", `SELECT GEOID20 AS geoid, ALAND20 AS aland FROM tl_2020_${st}_tabblock20`,
      "-t_srs", "EPSG:4326", "-lco", "COORDINATE_PRECISION=6"], { encoding: "utf8" });
    if (g.status !== 0 || !existsSync(seq)) throw new Error(`ogr2ogr ${usps}: ${g.stderr}`);
    let n = 0, missing = 0;
    for await (const line of createInterface({ input: createReadStream(seq) })) {
      if (!line.trim()) continue;
      const f = JSON.parse(line);
      const geoid = String(f.properties.geoid), aland = Number(f.properties.aland) || 0;
      const c = counts.get(geoid);
      if (!c) { missing++; continue; }
      const [pop, hu, vac] = c;
      const d = derive({ pop, hu, vac, aland });
      f.properties = { geoid };
      for (const [k, v] of Object.entries(d)) if (v != null) f.properties[k] = round(v);
      out.write(JSON.stringify(f) + "\n");
      // Aggregate keys: Connecticut's 2020 blocks map to current tracts / block groups.
      const x = st === "09" ? ct.get(geoid) : undefined;
      if (st === "09" && !x) throw new Error(`ct_xwalk: block ${geoid} missing`);
      const bg = x ? x[1] : geoid.slice(0, 12), tract = x ? x[0] : geoid.slice(0, 11);
      add("block_group", bg, pop, hu, vac, aland);
      add("tract", tract, pop, hu, vac, aland);
      add("county", tract.slice(0, 5), pop, hu, vac, aland);
      add("state", st, pop, hu, vac, aland);
      n++;
    }
    rmSync(seq, { force: true });
    blocks += n;
    log("census2020", `${name}: ${n.toLocaleString()} blocks${missing ? `, ${missing} shapes without counts (skipped)` : ""}`);
  }
  await new Promise((r) => out.end(r));

  const pool = db();
  const counts = new Map((Object.keys(LEN) as Array<keyof typeof totals>).map((l) => [l, new Map<string, Map<string, Counts>>()]));
  for (const e of entries) {
    if (e.measure.kind !== "census2020") continue;
    const kind = e.measure.value;
    await registerDataset(pool, e);
    for (const level of Object.keys(LEN) as Array<keyof typeof totals>) {
      const values = new Map<string, Value>();
      for (const [g, t] of totals[level]) values.set(g, { value: derive(t)[kind], moe: null });
      if (level === "block_group") writeStatic(e.id, level, values);
      else await writeValues(pool, e.id, level, values);
      counts.get(level)!.set(e.id, new Map([...totals[level]].map(([g, t]) => [g, census2020Counts(kind, t)])));
    }
    // U.S. row: the states summed (no Puerto Rico, as in the Census Bureau's U.S. total).
    const us: Totals = { pop: 0, hu: 0, vac: 0, aland: 0 };
    for (const [g, t] of totals.state) if (g !== "72") { us.pop += t.pop; us.hu += t.hu; us.vac += t.vac; us.aland += t.aland; }
    writeUs(e.id, null, { value: derive(us)[kind], moe: null }, census2020Counts(kind, us));
  }
  for (const [level, series] of counts) writeCounts(level, series);
  await pool.end();
  if (isCountsOnly()) return; // `ingest counts`: leave the block tiles as they are

  // Block tiles carry the values. Blocks are dropped as needed at low zoom (they'd be
  // sub-pixel anyway); tippecanoe adds zooms past 13 if it's still dropping, so the
  // deepest zoom has every block.
  const target = join(TILES, "block.pmtiles");
  log("census2020", `${blocks.toLocaleString()} blocks → tippecanoe`);
  // Temp files on disk: the national build needs tens of GB, more than a tmpfs /tmp holds.
  const tmp = join(CACHE, "tippecanoe-tmp");
  mkdirSync(tmp, { recursive: true });
  const t = spawnSync("tippecanoe", ["-o", target, "--force", "-l", "block", "-Z", "2", "-z", "13",
    "--drop-densest-as-needed", "--extend-zooms-if-still-dropping", "--detect-shared-borders", "--simplification=4", "-P", "-t", tmp, blocksOut],
    { stdio: ["ignore", "ignore", "inherit"] });
  if (t.status !== 0) throw new Error("tippecanoe failed for blocks");
  log("census2020", `wrote ${target}`);
}
