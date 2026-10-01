// Daily VMT per resident from HPMS (registry `measure.kind: hpms_vmt`).
import { spawnSync } from "node:child_process";
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, FIPS_RENAMES, log, STATES } from "./util.ts";
import { registerDataset, writeValues, type Level, type Value } from "./values.ts";

const USPS_TO_FIPS = Object.fromEntries(Object.entries(STATES).map(([fips, [, usps]]) => [usps, fips]));

function ogr(args: string[]): string {
  const r = spawnSync("ogrinfo", args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.error || r.status !== 0) throw new Error(`ogrinfo failed: ${r.error?.message ?? r.stderr.slice(0, 300)}`);
  return r.stdout;
}

export async function ingestVmt(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "hpms_vmt" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "hpms_vmt") continue;
    const m = e.measure;
    await registerDataset(pool, e);
    const zip = await cached(m.source.url, m.source.file);
    const ds = `/vsizip/${zip}/${m.source.path}`;
    const layers = ogr(["-ro", "-q", ds]).split("\n").map((l) => l.match(/^Layer: (\S+)/)?.[1]).filter((n): n is string => !!n && new RegExp(m.source.layerPattern).test(n));
    const vmt = { state: new Map<string, number>(), county: new Map<string, number>() };
    for (const layer of layers) {
      const st = USPS_TO_FIPS[layer.split("_")[2]];
      if (!st) { log(e.id, `${layer}: unknown state, skipped`); continue; }
      const out = ogr(["-ro", "-q", "-dialect", "SQLite", "-sql",
        `SELECT county_id, SUM(aadt * (end_point - begin_point)) AS vmt FROM ${layer} WHERE aadt > 0 AND end_point > begin_point GROUP BY county_id`, ds]);
      let cid: string | null = null;
      for (const line of out.split("\n")) {
        const c = line.match(/county_id \(\w+(?:\(\w+\))?\) = (\d+)/); if (c) { cid = c[1]; continue; }
        const v = line.match(/vmt \(Real\) = ([\d.e+-]+)/);
        if (v && cid != null) {
          const raw = st + cid.padStart(3, "0"), g = FIPS_RENAMES[raw] ?? raw, n = Number(v[1]);
          vmt.county.set(g, (vmt.county.get(g) ?? 0) + n);
          vmt.state.set(st, (vmt.state.get(st) ?? 0) + n);
          cid = null;
        }
      }
    }
    log(e.id, `${layers.length} state layers, ${Math.round([...vmt.state.values()].reduce((a, b) => a + b, 0) / 1e6).toLocaleString()}M vehicle-miles/day nationally`);
    for (const level of e.geographyLevels as Level[]) {
      if (level === "tract") continue;
      const { rows } = await pool.query<{ geoid: string; pop: number }>(
        `select v.geoid, v.value * g.aland_sqmi as pop from public.dataset_values v join public.geographies g using (geoid)
         where v.dataset_id = 'population_density' and v.level = $1 and v.value is not null`, [level]);
      const pop = new Map(rows.map((r) => [r.geoid, r.pop]));
      const values = new Map<string, Value>();
      for (const [g, p] of pop) if (!g.startsWith("72")) values.set(g, { value: vmt[level].has(g) && p > 0 ? vmt[level].get(g)! / p : null, moe: null });
      // Same rule as FARS: if >5% of a state's VMT sits under non-current county codes, its counties get no value.
      const lost = new Map<string, number>();
      for (const [g, n] of vmt[level]) if (!pop.has(g)) lost.set(g.slice(0, 2), (lost.get(g.slice(0, 2)) ?? 0) + n);
      for (const [st, n] of lost) {
        const share = n / (vmt.state.get(st) ?? n);
        log(e.id, `${level}: state ${st} has ${(100 * share).toFixed(1)}% of VMT under non-current codes${share > 0.05 ? " → counties set to no data" : ""}`);
        if (share > 0.05) for (const g of values.keys()) if (g.startsWith(st)) values.set(g, { value: null, moe: null });
      }
      await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
