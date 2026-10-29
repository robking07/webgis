// Metropolitan Planning Organizations (issue #276): a place to search for, not a dataset (no values).
// Source: BTS NTAD Metropolitan Planning Organizations (USDOT, public domain), simplified by the
// server. The source names one state per MPO; the states each one covers come from Census state
// outlines. Writes apps/web/public/mpo/index.json (search rows) and mpo/<id>.json (one shape each),
// committed and served by the site itself, so no upload. Run: npm run ingest -- mpo
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { cached, CACHE, log, ROOT } from "./util.ts";

const SRC = "https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_Metropolitan_Planning_Organizations/FeatureServer/0/query";
const STATES = "https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_500k.zip";
const OUT = join(ROOT, "apps/web/public/mpo");
const PAGE = 500;
/** A state counts as covered when it holds at least this share of the MPO (drops border slivers). */
const MIN_SHARE = 0.02;

type Geom = { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
type Feature = { properties: { MPO_ID: string; MPO_NAME: string; STATE: string; AREA: number }; geometry: Geom | null };

function ogr(args: string[]): string {
  const r = spawnSync("ogr2ogr", args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`ogr2ogr failed: ${r.stderr}`);
  return r.stdout;
}

export function bboxOf(g: Geom): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const walk = (c: unknown): void => {
    if (typeof (c as number[])[0] === "number") {
      const [x, y] = c as number[];
      w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y);
    } else for (const k of c as unknown[]) walk(k);
  };
  walk(g.coordinates);
  return [w, s, e, n];
}

export async function buildMpo() {
  const features: Feature[] = [];
  for (let offset = 0; ; ) {
    const q = new URLSearchParams({ where: "1=1", outFields: "MPO_ID,MPO_NAME,STATE,AREA", orderByFields: "OBJECTID", f: "geojson",
      maxAllowableOffset: "0.002", geometryPrecision: "4", resultOffset: String(offset), resultRecordCount: String(PAGE) });
    const res = await fetch(`${SRC}?${q}`);
    if (!res.ok) throw new Error(`GET MPO page at ${offset} → ${res.status}`);
    const page = await res.json() as { features?: Feature[]; properties?: { exceededTransferLimit?: boolean }; error?: unknown };
    if (!page.features) throw new Error(`MPO query failed: ${JSON.stringify(page.error ?? page)}`);
    features.push(...page.features);
    offset += page.features.length;
    if (!page.features.length || !page.properties?.exceededTransferLimit) break;
  }
  const good = features.filter((f) => f.geometry && /^\w{1,10}$/.test(f.properties.MPO_ID ?? "") && f.properties.MPO_NAME?.trim());
  if (good.length < 300 || new Set(good.map((f) => f.properties.MPO_ID)).size !== good.length) throw new Error(`MPO: ${good.length} usable of ${features.length}, or duplicate ids`);
  log("mpo", `${good.length} MPOs`);

  // States each MPO covers: intersect with Census state outlines in SpatiaLite.
  const dir = join(CACHE, "mpo");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const src = join(dir, "mpo.geojson"), db = join(dir, "work.sqlite");
  writeFileSync(src, JSON.stringify({ type: "FeatureCollection", features: good }));
  ogr(["-f", "SQLite", "-dsco", "SPATIALITE=YES", db, src, "-nln", "mpo", "-nlt", "MULTIPOLYGON"]);
  ogr(["-append", "-f", "SQLite", db, `/vsizip/${await cached(STATES)}`, "-nln", "st", "-nlt", "MULTIPOLYGON", "-t_srs", "EPSG:4326"]);
  const csv = ogr(["-f", "CSV", "/vsistdout/", db, "-dialect", "SQLite", "-sql",
    `SELECT m.mpo_id AS id, s.stusps AS st FROM mpo m JOIN st s ON ST_Intersects(m.GEOMETRY, s.GEOMETRY)
     WHERE ST_Area(ST_Intersection(ST_MakeValid(m.GEOMETRY), s.GEOMETRY)) >= ${MIN_SHARE} * ST_Area(m.GEOMETRY)`]);
  const covered = new Map<string, Set<string>>();
  for (const line of csv.trim().split("\n").slice(1)) {
    const [id, st] = line.replaceAll('"', "").split(",");
    covered.set(id, (covered.get(id) ?? new Set()).add(st));
  }

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
  const rows = good.map(({ properties: p, geometry: g }) => {
    writeFileSync(join(OUT, `${p.MPO_ID}.json`), JSON.stringify({ type: g!.type, coordinates: g!.coordinates }));
    const others = [...(covered.get(p.MPO_ID) ?? [])].filter((s) => s !== p.STATE).sort();
    const b = bboxOf(g!).map(r4) as [number, number, number, number];
    // Same leading shape as geo/search.json rows ([name, kind, id, lon, lat, sq mi]), then states and bbox.
    return [p.MPO_NAME.trim(), "MPO", p.MPO_ID, r4((b[0] + b[2]) / 2), r4((b[1] + b[3]) / 2), Math.round(p.AREA), [p.STATE, ...others].join(", "), b];
  });
  writeFileSync(join(OUT, "index.json"), JSON.stringify(rows));
  log("mpo", `wrote ${rows.length} shapes and index.json to apps/web/public/mpo (${rows.filter((r) => String(r[6]).includes(",")).length} span states)`);
  await buildMpoCounties();
}

// Counties in each MPO (#292), for the focused-area totals: the share of each county's residents who
// live inside the MPO, from Census 2020 tract population centroids (public domain) tested against the
// shapes above. A tract counts wholly in or out by its centroid. Writes mpo/counties.json:
// { <MPO id>: [[county geoid, share 0–1, cut county's 6-digit tracts inside?], ...] }, only counties
// with residents inside. Shares are
// rounded down, so 1 means every resident is inside. Run alone: npm run ingest -- mpo-counties
// shortcut: 2020 tracts use Connecticut's old counties, so CT MPOs match no 2022+ county counts; redo with 2022 CT tracts if a CT planner needs it.
/** A county with at least this share of residents inside counts as whole: no tract list, so the panel
 *  never fetches a big county's tract file for a sliver (#390; same constant in apps/web lib/counts.ts). */
const WHOLE = 0.98;
const CENPOP = "https://www2.census.gov/geo/docs/reference/cenpop2020/tract/CenPop2020_Mean_TR.txt";

type Ring = number[][];
/** Even-odd test of a point against a Polygon or MultiPolygon (holes are rings too). */
export function inShape(g: Geom, x: number, y: number): boolean {
  const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as Ring[][];
  let inside = false;
  for (const poly of polys) for (const ring of poly) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** Each MPO's counties with their share of residents inside, from tract points [county, pop, lon,
 *  lat, tract]. A county cut by more than 2% (share under WHOLE) also lists its tracts inside (#390), so the panel can add
 *  those up instead of the whole county; tracts with no residents count by their centroid too (jobs). */
export function countyShares(shapes: Map<string, Geom>, tracts: Array<[string, number, number, number, string]>): Record<string, Array<[string, number] | [string, number, string[]]>> {
  const countyPop = new Map<string, number>();
  for (const [c, pop] of tracts) countyPop.set(c, (countyPop.get(c) ?? 0) + pop);
  const out: Record<string, Array<[string, number] | [string, number, string[]]>> = {};
  for (const [id, g] of shapes) {
    const [w, s, e, n] = bboxOf(g);
    const inside = new Map<string, { pop: number; tracts: string[] }>();
    for (const [c, pop, x, y, t] of tracts) {
      if (!(x >= w && x <= e && y >= s && y <= n && inShape(g, x, y))) continue;
      const k = inside.get(c) ?? { pop: 0, tracts: [] };
      k.pop += pop;
      k.tracts.push(t);
      inside.set(c, k);
    }
    out[id] = [...inside].filter(([, k]) => k.pop > 0).map(([c, k]): [string, number] | [string, number, string[]] => {
      const share = Math.floor((k.pop / countyPop.get(c)!) * 1000) / 1000;
      return share < WHOLE ? [c, share, k.tracts.sort()] : [c, share];
    }).sort((a, b) => a[0].localeCompare(b[0]));
  }
  return out;
}

export async function buildMpoCounties() {
  const rows = readFileSync(await cached(CENPOP), "utf8").replace(/^﻿/, "").trim().split(/\r?\n/);
  const head = rows[0].split(",");
  const [st, co, tr, pop, lat, lon] = ["STATEFP", "COUNTYFP", "TRACTCE", "POPULATION", "LATITUDE", "LONGITUDE"].map((k) => head.indexOf(k));
  if ([st, co, tr, pop, lat, lon].includes(-1)) throw new Error(`CenPop columns changed: ${rows[0]}`);
  const tracts = rows.slice(1).map((l) => l.split(",")).map((f): [string, number, number, number, string] => [f[st] + f[co], Number(f[pop]), Number(f[lon]), Number(f[lat]), f[tr]]);
  if (tracts.length < 80000) throw new Error(`CenPop: only ${tracts.length} tracts`);
  const index = JSON.parse(readFileSync(join(OUT, "index.json"), "utf8")) as Array<[string, string, string]>;
  const shapes = new Map(index.map((r) => [r[2], JSON.parse(readFileSync(join(OUT, `${r[2]}.json`), "utf8")) as Geom]));
  const out = countyShares(shapes, tracts);
  writeFileSync(join(OUT, "counties.json"), JSON.stringify(out));
  log("mpo", `counties.json: ${Object.keys(out).length} MPOs, ${Object.values(out).filter((l) => l.every(([, s]) => s === 1)).length} made of whole counties`);
}
