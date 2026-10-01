// Boundary tiles: Census cartographic boundary shapefiles → PMTiles, one file per
// geography level. Each feature carries only `geoid` and `name`; values are joined
// in the browser through feature state (promoteId: "geoid"), so these tiles never
// change per dataset.
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import unzipper from "unzipper";
import * as shapefile from "shapefile";
import { cached, CACHE, log, STATES, TILES } from "./util.ts";

const CB = "https://www2.census.gov/geo/tiger/GENZ2024/shp";

/** [level, CB file, tile minzoom, tile maxzoom]. Display zooms come from design GEO_LEVELS. */
const LEVELS = [
  ["state", "cb_2024_us_state_500k", 0, 7],
  ["county", "cb_2024_us_county_500k", 0, 10],
  ["tract", "cb_2024_us_tract_500k", 6, 12],
] as const;

function nameOf(level: string, p: Record<string, string>): string {
  const st = STATES[p.STATEFP]?.[1] ?? p.STATEFP;
  if (level === "state") return p.NAME;
  if (level === "county") return `${p.NAMELSAD}, ${st}`;
  return `${p.NAMELSAD}, ${p.NAMELSADCO ?? ""}${p.NAMELSADCO ? ", " : ""}${st}`;
}

export async function buildTiles(only?: string[]) {
  const probe = spawnSync("tippecanoe", ["--version"], { encoding: "utf8" });
  if (probe.error) throw new Error("tippecanoe not found. Install it: sudo apt install -y tippecanoe");
  mkdirSync(TILES, { recursive: true });
  for (const [level, file, minz, maxz] of LEVELS) {
    if (only && !only.includes(level)) continue;
    const zipPath = await cached(`${CB}/${file}.zip`);
    const dir = join(CACHE, file);
    mkdirSync(dir, { recursive: true });
    const zip = await unzipper.Open.buffer(readFileSync(zipPath));
    for (const f of zip.files) if (/\.(shp|dbf|prj)$/.test(f.path)) writeFileSync(join(dir, f.path), await f.buffer());
    const seq = join(dir, `${level}.geojsonl`);
    const out = createWriteStream(seq);
    const src = await shapefile.open(join(dir, `${file}.shp`), join(dir, `${file}.dbf`), { encoding: "utf-8" });
    let n = 0;
    for (let r = await src.read(); !r.done; r = await src.read()) {
      const p = r.value.properties as Record<string, string>;
      if (!STATES[p.STATEFP]) continue; // drop territories other than PR
      out.write(JSON.stringify({ type: "Feature", properties: { geoid: p.GEOID, name: nameOf(level, p) }, geometry: r.value.geometry }) + "\n");
      n++;
    }
    await new Promise((res) => out.end(res));
    const target = join(TILES, `${level}.pmtiles`);
    const args = [
      "-o", target, "--force", "-l", level, "-Z", String(minz), "-z", String(maxz),
      "--detect-shared-borders", "--no-tiny-polygon-reduction", "--no-feature-limit", "--no-tile-size-limit",
      "--simplification=4", "-P", seq,
    ];
    log("tiles", `${level}: ${n} features → tippecanoe z${minz}–${maxz}`);
    const t = spawnSync("tippecanoe", args, { stdio: ["ignore", "ignore", "inherit"] });
    if (t.status !== 0) throw new Error(`tippecanoe failed for ${level}`);
    log("tiles", `wrote ${target}`);
  }
}
