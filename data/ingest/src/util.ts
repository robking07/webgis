// Shared ingest helpers: paths, cached downloads, database access.
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import pg from "pg";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const CACHE = join(ROOT, "data/cache");
export const TILES = join(ROOT, "data/tiles");
export const WEB_DATA = join(ROOT, "apps/web/public/data");

/** Download once into data/cache; later runs reuse the file. */
export async function cached(url: string, name = url.split("/").pop()!): Promise<string> {
  const path = join(CACHE, name);
  if (existsSync(path)) return path;
  mkdirSync(CACHE, { recursive: true });
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`GET ${url} → ${res.status}`);
  const tmp = `${path}.part`;
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tmp));
  const { renameSync } = await import("node:fs");
  renameSync(tmp, path);
  return path;
}

export function db(): pg.Pool {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL is not set (.env.local)");
  return new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 4 });
}

export function log(step: string, msg: string) {
  console.log(`[${step}] ${msg}`);
}

/** 50 states + DC + PR, FIPS → name and USPS code. */
export const STATES: Record<string, [string, string]> = {
  "01": ["Alabama", "AL"], "02": ["Alaska", "AK"], "04": ["Arizona", "AZ"], "05": ["Arkansas", "AR"],
  "06": ["California", "CA"], "08": ["Colorado", "CO"], "09": ["Connecticut", "CT"], "10": ["Delaware", "DE"],
  "11": ["District of Columbia", "DC"], "12": ["Florida", "FL"], "13": ["Georgia", "GA"], "15": ["Hawaii", "HI"],
  "16": ["Idaho", "ID"], "17": ["Illinois", "IL"], "18": ["Indiana", "IN"], "19": ["Iowa", "IA"],
  "20": ["Kansas", "KS"], "21": ["Kentucky", "KY"], "22": ["Louisiana", "LA"], "23": ["Maine", "ME"],
  "24": ["Maryland", "MD"], "25": ["Massachusetts", "MA"], "26": ["Michigan", "MI"], "27": ["Minnesota", "MN"],
  "28": ["Mississippi", "MS"], "29": ["Missouri", "MO"], "30": ["Montana", "MT"], "31": ["Nebraska", "NE"],
  "32": ["Nevada", "NV"], "33": ["New Hampshire", "NH"], "34": ["New Jersey", "NJ"], "35": ["New Mexico", "NM"],
  "36": ["New York", "NY"], "37": ["North Carolina", "NC"], "38": ["North Dakota", "ND"], "39": ["Ohio", "OH"],
  "40": ["Oklahoma", "OK"], "41": ["Oregon", "OR"], "42": ["Pennsylvania", "PA"], "44": ["Rhode Island", "RI"],
  "45": ["South Carolina", "SC"], "46": ["South Dakota", "SD"], "47": ["Tennessee", "TN"], "48": ["Texas", "TX"],
  "49": ["Utah", "UT"], "50": ["Vermont", "VT"], "51": ["Virginia", "VA"], "53": ["Washington", "WA"],
  "54": ["West Virginia", "WV"], "55": ["Wisconsin", "WI"], "56": ["Wyoming", "WY"], "72": ["Puerto Rico", "PR"],
};

/** Bulk upsert rows through a temp table + COPY-free multi-row inserts, in batches. */
export async function upsert(pool: pg.Pool, table: string, cols: string[], key: string[], rows: unknown[][], batch = 2000) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (let i = 0; i < rows.length; i += batch) {
      const chunk = rows.slice(i, i + batch);
      const params: unknown[] = [];
      const tuples = chunk.map((r) => `(${r.map((v) => { params.push(v); return `$${params.length}`; }).join(",")})`);
      const updates = cols.filter((c) => !key.includes(c)).map((c) => `${c} = excluded.${c}`).join(", ");
      await client.query(
        `insert into ${table} (${cols.join(",")}) values ${tuples.join(",")} on conflict (${key.join(",")}) do ${updates ? `update set ${updates}` : "nothing"}`,
        params,
      );
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

/** Comma split that respects double-quoted fields (the crosswalk quotes names containing commas). */
export function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}


/** County FIPS renames with unchanged boundaries (Census "substantial changes" list). */
export const FIPS_RENAMES: Record<string, string> = {
  "46113": "46102", // Shannon County, SD → Oglala Lakota County (2015)
  "02270": "02158", // Wade Hampton Census Area, AK → Kusilvak Census Area (2015)
  "51515": "51019", // Bedford city, VA merged into Bedford County (2013)
};
