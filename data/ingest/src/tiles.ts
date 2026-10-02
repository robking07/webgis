// Boundary tiles: Census cartographic boundary shapefiles → PMTiles, one file per
// geography level. Each feature carries only `geoid` and `name`; values are joined
// in the browser through feature state (promoteId: "geoid"), so these tiles never
// change per dataset.
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import unzipper from "unzipper";
import * as shapefile from "shapefile";
import { cached, CACHE, log, STATES, TILES, WEB_DATA } from "./util.ts";
import { readGazetteer } from "./geographies.ts";

const CB = (year: number) => `https://www2.census.gov/geo/tiger/GENZ${year}/shp`;

/** [tile file, layer, CB year, tile minzoom, tile maxzoom]. Display zooms come from design
 *  GEO_LEVELS. The -2019 files carry 2010 tracts and pre-2022 Connecticut counties for
 *  timeline periods keyed to them (D-36); they use the same layer names, so the map swaps
 *  the source and keeps its layers. */
const LEVELS = [
  ["state", "state", 2024, 0, 7],
  ["county", "county", 2024, 0, 10],
  ["tract", "tract", 2024, 2, 12],
  ["block_group", "block_group", 2024, 2, 12],
  ["county-2019", "county", 2019, 0, 10],
  ["tract-2019", "tract", 2019, 2, 12],
] as const;

/** Layer → cartographic boundary file name part, where they differ. */
const CB_FILE: Record<string, string> = { block_group: "bg" };

/** County names ("Hennepin County, MN") for block-group names; the BG file doesn't carry them (D-124). */
let countyNames: Record<string, string> | null = null;

/** 2019 CB files have no NAMELSAD, so names come from that year's Gazetteer. */
async function names2019(): Promise<Map<string, string>> {
  return new Map((await readGazetteer("2019_Gaz_counties_national")).map((r) => [r.GEOID, r.NAME]));
}

function nameOf(level: string, p: Record<string, string>, county?: Map<string, string>): string {
  const st = STATES[p.STATEFP]?.[1] ?? p.STATEFP;
  if (level === "state") return p.NAME;
  if (level === "block_group") {
    countyNames ??= JSON.parse(readFileSync(join(WEB_DATA, "geo/names.json"), "utf8")) as Record<string, string>;
    return `${p.NAMELSAD}, Tract ${Number(p.TRACTCE) / 100}, ${countyNames[p.STATEFP + p.COUNTYFP] ?? st}`;
  }
  const co = p.NAMELSADCO ?? (p.NAMELSAD ? undefined : county?.get(p.GEOID.slice(0, 5)));
  if (level === "county") return `${p.NAMELSAD ?? co ?? p.NAME}, ${st}`;
  return `${p.NAMELSAD ?? `Census Tract ${p.NAME}`}, ${co ?? ""}${co ? ", " : ""}${st}`;
}

export async function buildTiles(only?: string[]) {
  const probe = spawnSync("tippecanoe", ["--version"], { encoding: "utf8" });
  if (probe.error) throw new Error("tippecanoe not found. Install it: sudo apt install -y tippecanoe");
  mkdirSync(TILES, { recursive: true });
  for (const [name, level, year, minz, maxz] of LEVELS) {
    if (only && !only.includes(name)) continue;
    const file = `cb_${year}_us_${CB_FILE[level] ?? level}_500k`;
    const county = year === 2019 ? await names2019() : undefined;
    const zipPath = await cached(`${CB(year)}/${file}.zip`);
    const dir = join(CACHE, file);
    mkdirSync(dir, { recursive: true });
    const zip = await unzipper.Open.buffer(readFileSync(zipPath));
    for (const f of zip.files) if (/\.(shp|dbf|prj)$/.test(f.path)) writeFileSync(join(dir, f.path), await f.buffer());
    const seq = join(dir, `${name}.geojsonl`);
    const out = createWriteStream(seq);
    const src = await shapefile.open(join(dir, `${file}.shp`), join(dir, `${file}.dbf`), { encoding: "utf-8" });
    let n = 0;
    for (let r = await src.read(); !r.done; r = await src.read()) {
      const p = r.value.properties as Record<string, string>;
      if (!STATES[p.STATEFP]) continue; // drop territories other than PR
      out.write(JSON.stringify({ type: "Feature", properties: { geoid: p.GEOID, name: nameOf(level, p, county) }, geometry: r.value.geometry }) + "\n");
      n++;
    }
    await new Promise((res) => out.end(res));
    const target = join(TILES, `${name}.pmtiles`);
    const args = [
      "-o", target, "--force", "-l", level, "-Z", String(minz), "-z", String(maxz),
      "--detect-shared-borders", "--no-tiny-polygon-reduction", "--no-feature-limit", "--no-tile-size-limit",
      "--simplification=4", "-P", seq,
    ];
    log("tiles", `${name}: ${n} features → tippecanoe z${minz}–${maxz}`);
    const t = spawnSync("tippecanoe", args, { stdio: ["ignore", "ignore", "inherit"] });
    if (t.status !== 0) throw new Error(`tippecanoe failed for ${name}`);
    log("tiles", `wrote ${target}`);
  }
}
