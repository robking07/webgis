// Move tract values out of the database into static files (D-113).
//   npm run ingest -- tracts-out           write the files from the database's tract rows
//   npm run ingest -- tracts-out --drop    then delete those rows and reclaim the space
// Run --drop only after the web app that reads tract details from the files is deployed.
//   npm run ingest -- split-tracts         one-off (D-506): the live all-maps files on R2
//                                          (values/tracts/<county>.json) → values/<id>/tracts/<county>.json
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadRegistry } from "@webgis/registry/load";
import { db, log, TILES } from "./util.ts";
import { tractFile, writeTractValues, type Value } from "./values.ts";
import { getLive, liveEtags, r2 } from "./publish-tiles.ts";

/** One county's all-maps file → one file per map, under `root`. */
export function splitShard(shard: Record<string, Record<string, unknown>>, county: string, root = TILES) {
  for (const [id, rows] of Object.entries(shard)) {
    const f = tractFile(id, county, root);
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, JSON.stringify(rows));
  }
}

/** Read every live values/tracts/<county>.json from R2 (not data/tiles, so an incomplete local
 *  folder can't shape the result) and write the per-map files. For an empty data/tiles only (the
 *  one-off "Split tract files" workflow): any per-map tract file already there may be newer. */
export async function splitTracts() {
  const values = join(TILES, "values");
  if (existsSync(values) && readdirSync(values).some((id) => existsSync(join(values, id, "tracts"))))
    throw new Error("split-tracts: data/tiles already has per-map tract files; run it from an empty data/tiles");
  const { s3, bucket } = r2();
  const queue = [...(await liveEtags(s3, bucket, "values/tracts")).keys()]
    .map((k) => k.slice("values/tracts/".length)).filter((f) => /^\d{5}\.json$/.test(f)).map((f) => f.slice(0, 5));
  const total = queue.length;
  const worker = async () => {
    for (let c = queue.pop(); c; c = queue.pop()) {
      const shard = await getLive(s3, bucket, `values/tracts/${c}.json`);
      if (shard) splitShard(shard as Record<string, Record<string, unknown>>, c);
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker));
  log("tracts", `split ${total} county files into per-map files under data/tiles/values/<id>/tracts/`);
}

export async function tractsOut(args: string[] = []) {
  const drop = args.includes("--drop");
  const only = args.filter((a) => !a.startsWith("--"));
  // Only this checkout's registry: the database is shared with unmerged branches' datasets.
  const ids = new Set(loadRegistry().map((e) => e.id));
  const pool = db();
  const { rows: sets } = await pool.query<{ dataset_id: string }>(
    "select distinct dataset_id from public.dataset_values where level = 'tract' order by 1");
  for (const { dataset_id } of sets) {
    if (!ids.has(dataset_id) || (only.length && !only.includes(dataset_id))) continue;
    const { rows } = await pool.query<{ geoid: string; value: number | null; moe: number | null }>(
      "select geoid, value, moe from public.dataset_values where dataset_id = $1 and level = 'tract'", [dataset_id]);
    writeTractValues(dataset_id, new Map<string, Value>(rows.map((r) => [r.geoid, { value: r.value, moe: r.moe }])));
    log("tracts", `${dataset_id}: ${rows.length} tract values written to files`);
    if (drop) {
      await pool.query("delete from public.dataset_values where dataset_id = $1 and level = 'tract'", [dataset_id]);
      log("tracts", `${dataset_id}: tract rows deleted from the database`);
    }
  }
  if (drop) {
    log("tracts", "vacuum full dataset_values (reclaims the space)…");
    await pool.query("vacuum full public.dataset_values");
    const { rows } = await pool.query<{ size: string }>("select pg_size_pretty(pg_database_size(current_database())) size");
    log("tracts", `database size now ${rows[0].size}`);
  }
  await pool.end();
}
