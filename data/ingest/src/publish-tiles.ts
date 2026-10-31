// Upload data/tiles/*.pmtiles to Cloudflare R2 (D-01) and set the bucket CORS rule
// the browser needs for PMTiles range requests.
import { createReadStream, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { GetObjectCommand, ListObjectsV2Command, S3Client, PutBucketCorsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { log, TILES } from "./util.ts";
import { DETAILS_DIR } from "./details.ts";

export function r2() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) throw new Error("R2_* settings missing in .env.local");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    maxAttempts: 8, // retries with backoff; large multipart uploads hit transient timeouts
  });
  return { s3, bucket: R2_BUCKET };
}

export async function publishTiles(only?: string[]) {
  const { s3, bucket: R2_BUCKET } = r2();
  await s3.send(new PutBucketCorsCommand({
    Bucket: R2_BUCKET,
    CORSConfiguration: { CORSRules: [{
      AllowedOrigins: ["https://mapwich.org", "https://www.mapwich.org", "https://*.vercel.app", "http://localhost:3000"],
      AllowedMethods: ["GET", "HEAD"],
      AllowedHeaders: ["range", "if-match"],
      ExposeHeaders: ["etag", "content-length", "content-range", "accept-ranges"],
      MaxAgeSeconds: 86400,
    }] },
  }));
  log("r2", "CORS rule set");
  for (const f of readdirSync(TILES).filter((f) => f.endsWith(".pmtiles") && (!only || only.includes(f.replace(/\.pmtiles$/, ""))))) {
    const path = join(TILES, f);
    await new Upload({
      client: s3,
      params: { Bucket: R2_BUCKET, Key: f, Body: createReadStream(path), ContentType: "application/vnd.pmtiles", CacheControl: "public, max-age=86400" },
      partSize: 16 * 1024 * 1024,
      queueSize: 4,
    }).done();
    log("r2", `uploaded ${f} (${(statSync(path).size / 1e6).toFixed(1)} MB)`);
  }
}

// JSON beside the tiles (values/, geo/, details/) is uploaded gzip-encoded with a one-hour cache:
// keys never change, so a re-upload reaches visitors within the hour without a code deploy (S2).
const JSON_CACHE = "public, max-age=3600";

/** Keys (datasets in a shard, tracts in a map's tract file) that `live` holds but `next` would drop. */
export function droppedDatasets(live: Record<string, unknown>, next: Record<string, unknown>): string[] {
  return Object.keys(live).filter((k) => !(k in next));
}

/** Files that hold many datasets for one county: the old all-maps tract files (D-113, no longer
 *  written since D-506) and the tract and block-group counts (values/counts/<level>/<county>.json, #156). */
export const SHARD_PREFIXES = ["values/tracts/", "values/counts/"];

/** One map's tract file for one county (values/<id>/tracts/<county>.json, D-506). Only that map's
 *  load writes it, so it can't drop another map; the checks refuse one that drops live tracts. */
export const isTractFile = (key: string) => /^values\/[a-z0-9_]+\/tracts\/\d{5}\.json$/.test(key);
/** One map's state or county values (values/<id>/{state,county}.json, from export-values). */
const isLevelFile = (key: string) => /^values\/[a-z0-9_]+\/(state|county)\.json$/.test(key);

/** What would be lost if `changed` went up, checked before anything does (one list for the lot):
 *  - a shard that drops a live dataset: a checkout without the full shards writes ones holding only
 *    what it just loaded, which would erase other datasets on the live site (2026-10-08);
 *  - a map's tract file that drops live tracts (a reload that came back short for a county);
 *  - a reloaded map (one with tract files here) whose county files on R2 include one this load
 *    doesn't have: its stale file would stay live, since publish never deletes;
 *  - a map's state or county file with fewer places than the live one (a short database, #449).
 *  Only files R2 already holds (`liveKeys`) are fetched. `local`: every key this upload covers. */
export async function uploadProblems(changed: { key: string; body: Buffer }[], liveKeys: Set<string>, local: Set<string>,
  fetchLive: (key: string) => Promise<Record<string, unknown> | null>): Promise<string[]> {
  const problems: string[] = [];
  const maps = new Set([...local].filter(isTractFile).map((k) => k.split("/")[1]));
  for (const k of liveKeys) if (isTractFile(k) && maps.has(k.split("/")[1]) && !local.has(k)) problems.push(`${k}: on R2 but not in this load (stale county)`);
  const queue = changed.filter((c) => liveKeys.has(c.key) && (isTractFile(c.key) || isLevelFile(c.key) || SHARD_PREFIXES.some((p) => c.key.startsWith(p))));
  const worker = async () => {
    for (let c = queue.pop(); c; c = queue.pop()) {
      const live = await fetchLive(c.key);
      if (!live) continue;
      const next = JSON.parse(gunzipSync(c.body).toString("utf8"));
      if (isLevelFile(c.key)) {
        // A count, not a key diff: a real boundary change (Connecticut's 2022 counties) swaps geoids.
        const [had, has] = [Object.keys(live).length, Object.keys(next).length];
        if (has < had) problems.push(`${c.key}: would cut ${had} live places to ${has}`);
        continue;
      }
      const dropped = droppedDatasets(live, next);
      if (!dropped.length) continue;
      const list = `${dropped.slice(0, 5).join(", ")}${dropped.length > 5 ? ", …" : ""}`;
      problems.push(isTractFile(c.key) ? `${c.key}: would drop ${dropped.length} live tract(s) (${list})` : `${c.key}: would drop ${dropped.length} live dataset(s) (${list})`);
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker));
  return problems.sort();
}

const DROP_HINT = "A map's tract file or county missing: its reload came back short; check the source. A shard (values/counts/) dropping a dataset: "
  + "this checkout's data/tiles/values/counts is incomplete; copy the full folder in or rebuild it with `ingest counts`. values/tracts/ is no longer "
  + "written (D-506): delete a stale local copy. Set ALLOW_TRACT_DROP=1 only when the loss is real (a dataset removed, a new tract vintage).";

/** The object R2 holds now, parsed (null if there is none). */
export async function getLive(s3: S3Client, bucket: string, key: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const raw = Buffer.from(await r.Body!.transformToByteArray());
    return JSON.parse((r.ContentEncoding === "gzip" ? gunzipSync(raw) : raw).toString("utf8"));
  } catch (e) {
    if ((e as { name?: string }).name === "NoSuchKey") return null;
    throw e;
  }
}

/** Every object key under `prefix/` with its ETag (quotes stripped). */
export async function liveEtags(s3: S3Client, bucket: string, prefix: string) {
  const etags = new Map<string, string>();
  let token: string | undefined;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${prefix}/`, ContinuationToken: token }));
    for (const o of r.Contents ?? []) if (o.Key && o.ETag) etags.set(o.Key, o.ETag.replace(/"/g, ""));
    token = r.NextContinuationToken;
  } while (token);
  return etags;
}

/** One county's shard after a partial reload: the live shard with the reloaded datasets (or count
 *  series) replaced by this run's rows. `dropped` lists reloaded ones the county had and no longer has. */
export function mergeShard(live: Record<string, unknown>, local: Record<string, unknown>, reloaded: Set<string>) {
  const next = Object.fromEntries(Object.entries({ ...live, ...local })
    .filter(([k]) => k in local || !reloaded.has(k))
    .sort(([a], [b]) => a.localeCompare(b)));
  return { next, dropped: droppedDatasets(live, next) };
}

/** Shard folders a fresh checkout's run may have written (tract and block-group counts). Tract
 *  values need no merge: each map has its own files (D-506). */
const SHARD_DIRS = ["values/counts/tract", "values/counts/block_group"];

/** `ingest publish-reload`, for a checkout that holds only what this run loaded (a GitHub runner,
 *  #369, D-478): rewrite each local shard as the live one from R2 with only the reloaded datasets
 *  swapped in, and stop before any upload if a county would lose one. Then upload all of values/
 *  (only changed files go up; the drop guard re-checks each shard and each map's tract files). A run
 *  that wrote no tract or block-group counts has no shard folders, so this skips straight to the value files. */
export async function publishReload() {
  const { s3, bucket } = r2();
  const dropped: string[] = [];
  for (const prefix of SHARD_DIRS.filter((p) => existsSync(join(TILES, p)))) {
    const dir = join(TILES, prefix);
    const local = new Map(readdirSync(dir).filter((f) => f.endsWith(".json"))
      .map((f) => [f, JSON.parse(readFileSync(join(dir, f), "utf8")) as Record<string, unknown>]));
    if (!local.size) continue;
    const reloaded = new Set([...local.values()].flatMap((s) => Object.keys(s)));
    // Every live county too: a reloaded dataset may have left a county this run wrote no file for.
    const files = new Set([...local.keys(), ...[...(await liveEtags(s3, bucket, prefix)).keys()]
      .map((k) => k.slice(prefix.length + 1)).filter((f) => /^\d{5}\.json$/.test(f))]);
    const queue = [...files];
    const worker = async () => {
      for (let f = queue.pop(); f; f = queue.pop()) {
        const m = mergeShard((await getLive(s3, bucket, `${prefix}/${f}`)) ?? {}, local.get(f) ?? {}, reloaded);
        if (m.dropped.length) dropped.push(`${prefix}/${f}: ${m.dropped.join(", ")}`);
        writeFileSync(join(dir, f), JSON.stringify(m.next));
      }
    };
    await Promise.all(Array.from({ length: 16 }, worker));
    log("r2", `${prefix}: ${[...reloaded].join(", ")} merged into ${files.size} live files`);
  }
  if (dropped.length && process.env.ALLOW_TRACT_DROP !== "1") throw new Error(`nothing uploaded: ${dropped.length} file(s) would lose reloaded data, e.g. ${dropped.slice(0, 3).join("; ")}. `
    + "Check the source for missing tracts; set ALLOW_TRACT_DROP=1 locally only if the loss is real.");
  await publishValues();
}

function walk(dir: string, rel = ""): string[] {
  return readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(dir, join(rel, e.name)) : e.name.endsWith(".json") ? [join(rel, e.name)] : []);
}

/** Upload every .json file under data/tiles/<prefix>/ (optionally only `dirs`, its top-level
 *  folders) to R2 under the same key. Files whose gzipped bytes match what R2 already holds (by
 *  ETag, the MD5 of a single-part upload) are skipped, so a re-run uploads only what changed.
 *  Every changed file is checked first (uploadProblems); if any fails, nothing goes up.
 *  `client` and `tiles`: R2 and data/tiles (tests pass a fake and a temp dir). */
export async function publishJson(prefix: string, hint: string, dirs?: string[], keep: (file: string) => boolean = () => true,
  client: { s3: Pick<S3Client, "send">; bucket: string } = r2(), tiles = TILES) {
  const { s3, bucket } = client;
  const root = join(tiles, prefix);
  if (!existsSync(root)) throw new Error(`no data/tiles/${prefix}; run \`ingest ${hint}\` first`);
  const files = walk(root).filter((f) => (!dirs || dirs.includes(f.split("/")[0])) && keep(f));
  const etags = await liveEtags(s3 as S3Client, bucket, prefix);
  let bytes = 0;
  const changed = files.flatMap((f) => {
    const key = `${prefix}/${f}`, body = gzipSync(readFileSync(join(root, f)));
    bytes += body.length;
    return etags.get(key) === createHash("md5").update(body).digest("hex") ? [] : [{ key, body }];
  });
  if (process.env.ALLOW_TRACT_DROP !== "1") {
    const problems = await uploadProblems(changed, new Set(etags.keys()), new Set(files.map((f) => `${prefix}/${f}`)), (k) => getLive(s3 as S3Client, bucket, k));
    if (problems.length) throw new Error(`nothing uploaded: ${problems.length} file(s) would lose live data, e.g. ${problems.slice(0, 5).join("; ")}. ${DROP_HINT}`);
  }
  let sent = 0, next = 0;
  const worker = async () => {
    for (let i = next++; i < changed.length; i = next++) {
      const { key, body } = changed[i];
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "application/json", ContentEncoding: "gzip", CacheControl: JSON_CACHE }));
      if (++sent % 500 === 0) log("r2", `${prefix}: ${sent} uploaded…`);
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker));
  log("r2", `${prefix}: ${sent} uploaded, ${files.length - changed.length} unchanged (${files.length} files, ${(bytes / 1e6).toFixed(1)} MB gzipped)`);
}

/** Every level's values (values/<id>/[<stop>/]<level>.json, values/<id>/tracts/<county>.json), gzip-encoded. */
export const publishValues = (only?: string[]) => publishJson("values", "export", only);
/** Names, map points, the place search index and tract geography (geo/), gzip-encoded. */
export const publishGeo = () => publishJson("geo", "export` and `ingest tract-geo");
/** Only the place search index and ZIP lookup (geo/search.json, geo/zips.json, from `ingest search`), so a
 *  partial or stale geo/ folder never overwrites live names or tract geography (#332). */
export const publishSearch = () => publishJson("geo", "search", undefined, (f) => f === "search.json" || f === "zips.json");
/** The state/county click details (details/, from `ingest details`), gzip-encoded. */
export const publishDetails = () => publishJson("details", "details");
/** Similar counties (similar/similar.json, from `ingest similar`, #401), gzip-encoded. */
export const publishSimilar = () => publishJson("similar", "similar");
/** City and metro area files (areas/, from `ingest areas`, #332), gzip-encoded. */
export const publishAreas = () => publishJson("areas", "areas");

/** The files `ingest counts` writes (#156, #154), relative to values/: margins of error, counts, U.S.
 *  rows and the tract and block-group count shards. Nothing else matches, so existing files are
 *  never re-sent by `publish-counts`, whatever state the rest of data/tiles is in. */
const COUNT_FILES = [
  /^[a-z0-9_]+\/(\d{4}\/)?(state|county|tract)\.moe\.json$/,
  /^[a-z0-9_]+\/(state|county)\.counts\.json$/,
  /^[a-z0-9_]+\/(\d{4}\/)?us\.json$/,
  /^counts\/(tract|block_group)\/\d{5}\.json$/,
];
export const isCountFile = (f: string) => COUNT_FILES.some((re) => re.test(f));
/** `ingest publish-counts`: upload only the files `ingest counts` writes. */
export const publishCounts = (only?: string[]) => publishJson("values", "counts", only && [...only, "counts"], isCountFile);

/** `ingest publish-data`: everything the web reads beside the tiles, in one command (S2). */
export async function publishData(only?: string[]) {
  await publishValues(only);
  if (only) return;
  await publishGeo();
  if (existsSync(DETAILS_DIR)) await publishDetails();
}
