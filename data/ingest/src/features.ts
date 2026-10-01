// Feature layers (registry `measure.kind: features`): lines or points drawn from their own
// geometry. GDAL extracts the kept fields from every matching source layer, tippecanoe
// builds data/tiles/<id>.pmtiles (thinned by `rank` at low zoom), and
// apps/web/src/generated/layers.json records what the map needs to draw it.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { cached, CACHE, db, log, ROOT, TILES } from "./util.ts";
import { registerDataset } from "./values.ts";

const LAYERS_JSON = join(ROOT, "apps/web/src/generated/layers.json");

function run(cmd: string, args: string[]): string {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.error) throw new Error(`${cmd} not found (${r.error.message}). GDAL: micromamba env "gis" linked into ~/.local/bin (see build-tiles skill).`);
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr.slice(0, 500)}`);
  return r.stdout;
}

/** tippecanoe feature filter: at zoom z, keep features whose rank field ≤ the threshold for z. */
function rankFilter(rank: { field: string; showUpTo: Array<[number, number]> }, layer: string) {
  const steps = [...rank.showUpTo].sort((a, b) => a[0] - b[0]);
  const any: unknown[] = ["any"];
  steps.forEach(([z, max], i) => {
    const next = steps[i + 1]?.[0];
    const zoomClause: unknown[] = ["all", [">=", "$zoom", z]];
    if (next != null) zoomClause.push(["<", "$zoom", next]);
    any.push(["all", zoomClause, ["<=", rank.field, max]]);
  });
  return JSON.stringify({ [layer]: any });
}

export async function ingestFeatures(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "features" && (!only || only.includes(e.id)));
  const manifest: Record<string, unknown> = existsSync(LAYERS_JSON) ? JSON.parse(readFileSync(LAYERS_JSON, "utf8")) : {};
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "features") continue;
    const m = e.measure;
    await registerDataset(pool, e);
    const zip = await cached(m.source.url, m.source.file);
    const ds = `/vsizip/${zip}/${m.source.path}`;
    const layers = run("ogrinfo", ["-ro", "-q", ds]).split("\n")
      .map((l) => l.match(/^Layer: (\S+)/)?.[1]).filter((n): n is string => !!n && new RegExp(m.source.layerPattern).test(n));
    if (!layers.length) throw new Error(`${e.id}: no layers match ${m.source.layerPattern}`);
    const work = join(CACHE, `features-${e.id}`);
    rmSync(work, { recursive: true, force: true });
    mkdirSync(work, { recursive: true });
    const fields = Object.keys(m.fields);
    const files: string[] = [];
    let total = 0;
    for (const layer of layers) {
      const out = join(work, `${layer}.geojsonl`);
      // -dim XY drops the M (route measure) values; coordinates to ~10 cm.
      const common = ["-dim", "XY", "-t_srs", "EPSG:4326", "-lco", "COORDINATE_PRECISION=6"];
      if (m.select) {
        // SQL template with readable derived fields; {state} = USPS code from the layer name.
        const state = layer.match(/_([A-Z]{2})_/)?.[1] ?? "";
        const sql = m.select.replaceAll("{layer}", layer).replaceAll("{state}", state);
        run("ogr2ogr", ["-f", "GeoJSONSeq", out, ds, "-dialect", "SQLite", "-sql", sql, ...common]);
      } else {
        run("ogr2ogr", ["-f", "GeoJSONSeq", out, ds, layer, "-select", fields.join(","), ...common, ...(m.where ? ["-where", m.where] : [])]);
      }
      const n = readFileSync(out, "utf8").split("\n").filter(Boolean).length;
      total += n;
      if (n) files.push(out);
      log(e.id, `${layer}: ${n.toLocaleString()} features`);
    }
    const target = join(TILES, `${e.id}.pmtiles`);
    mkdirSync(TILES, { recursive: true });
    const args = [
      "-o", target, "--force", "-l", e.id, "-Z", String(m.zooms[0]), "-z", String(m.zooms[1]),
      "--drop-densest-as-needed", "--extend-zooms-if-still-dropping", "--simplification=6",
      ...(m.rank ? ["-j", rankFilter(m.rank, e.id)] : []),
      ...files,
    ];
    log(e.id, `${total.toLocaleString()} features from ${files.length} layers → tippecanoe`);
    const t = spawnSync("tippecanoe", args, { stdio: ["ignore", "ignore", "inherit"] });
    if (t.status !== 0) throw new Error(`tippecanoe failed for ${e.id}`);
    manifest[e.id] = {
      tiles: `${e.id}.pmtiles`, sourceLayer: e.id, geometry: m.geometry, valueField: m.valueField,
      // Normalize {label, unit} field specs; facets carry the categorical labels and explainers.
      fields: Object.fromEntries(Object.entries(m.fields).map(([k, v]) => [k, typeof v === "string" ? { label: v } : v])),
      rankField: m.rank?.field ?? null, featureCount: total,
    };
    writeFileSync(LAYERS_JSON, JSON.stringify(manifest, null, 1));
    rmSync(work, { recursive: true, force: true });
    log(e.id, `wrote ${target}`);
  }
  await pool.end();
}
