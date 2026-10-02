// Move tract values out of the database into static files (D-113).
//   npm run ingest -- tracts-out           write the files from the database's tract rows
//   npm run ingest -- tracts-out --drop    then delete those rows and reclaim the space
// Run --drop only after the web app that reads tract details from the files is deployed.
import { loadRegistry } from "@webgis/registry/load";
import { db, log } from "./util.ts";
import { writeTractValues, type Value } from "./values.ts";

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
