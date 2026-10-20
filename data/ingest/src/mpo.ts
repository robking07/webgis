// Metropolitan Planning Organizations (issue #276): a place to search for, not a dataset (no values).
// Source: BTS NTAD Metropolitan Planning Organizations (USDOT, public domain), simplified by the
// server. The source names one state per MPO; the states each one covers come from Census state
// outlines. Writes apps/web/public/mpo/index.json (search rows) and mpo/<id>.json (one shape each),
// committed and served by the site itself, so no upload. Run: npm run ingest -- mpo
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
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
}
