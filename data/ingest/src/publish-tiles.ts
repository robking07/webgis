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

function r2() {
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

/** Datasets a tract shard (values/tracts/<county>.json) holds but `next` would drop. */
export function droppedDatasets(live: Record<string, unknown>, next: Record<string, unknown>): string[] {
  return Object.keys(live).filter((k) => !(k in next));
}

/** Files that hold many datasets for one county: tract details (D-113) and the tract and block-group
 *  counts (values/counts/<level>/<county>.json, #156). */
export const SHARD_PREFIXES = ["values/tracts/", "values/counts/"];

/** A shard holds every dataset's tracts for one county, so a checkout that never had the
 *  shards writes new ones holding only what it just loaded. Uploading those would erase the other
 *  datasets' tract details on the live site (2026-10-08). Refuse instead, unless
 *  ALLOW_TRACT_DROP=1 says the drop is intended (a dataset being removed). */
async function guardTractShard(s3: S3Client, bucket: string, key: string, body: Buffer) {
  if (!SHARD_PREFIXES.some((p) => key.startsWith(p)) || process.env.ALLOW_TRACT_DROP === "1") return;
  const live = await getLive(s3, bucket, key);
  if (!live) return;
  const dropped = droppedDatasets(live, JSON.parse(gunzipSync(body).toString("utf8")));
  if (dropped.length) throw new Error(`${key}: upload would drop ${dropped.length} live dataset(s) (${dropped.slice(0, 5).join(", ")}${dropped.length > 5 ? ", …" : ""}). `
    + "This checkout's data/tiles/values/tracts (or values/counts) is incomplete: copy the full folder in (or rebuild it with `ingest tracts-out` plus the loads) first. "
    + "Set ALLOW_TRACT_DROP=1 only when removing a dataset on purpose.");
}

/** The object R2 holds now, parsed (null if there is none). */
async function getLive(s3: S3Client, bucket: string, key: string): Promise<Record<string, unknown> | null> {
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
async function liveEtags(s3: S3Client, bucket: string, prefix: string) {
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

/** Shard folders a fresh checkout's run may have written (tract values, tract and block-group counts). */
const SHARD_DIRS = ["values/tracts", "values/counts/tract", "values/counts/block_group"];

/** `ingest publish-reload`, for a checkout that holds only what this run loaded (a GitHub runner,
 *  #369, D-478): rewrite each local shard as the live one from R2 with only the reloaded datasets
 *  swapped in, and stop before any upload if a county would lose one. Then upload all of values/
 *  (only changed files go up; the drop guard re-checks each shard). A run that wrote no tract or
 *  block-group values has no shard folders, so this skips straight to the value files. */
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
 *  ETag, the MD5 of a single-part upload) are skipped, so a re-run uploads only what changed. */
async function publishJson(prefix: string, hint: string, dirs?: string[], keep: (file: string) => boolean = () => true) {
  const { s3, bucket } = r2();
  const root = join(TILES, prefix);
  if (!existsSync(root)) throw new Error(`no data/tiles/${prefix}; run \`ingest ${hint}\` first`);
  const files = walk(root).filter((f) => (!dirs || dirs.includes(f.split("/")[0])) && keep(f));
  const etags = await liveEtags(s3, bucket, prefix);
  let sent = 0, skipped = 0, bytes = 0, next = 0;
  const worker = async () => {
    for (let i = next++; i < files.length; i = next++) {
      const key = `${prefix}/${files[i]}`;
      const body = gzipSync(readFileSync(join(root, files[i])));
      bytes += body.length;
      if (etags.get(key) === createHash("md5").update(body).digest("hex")) { skipped++; continue; }
      await guardTractShard(s3, bucket, key, body);
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "application/json", ContentEncoding: "gzip", CacheControl: JSON_CACHE }));
      if (++sent % 500 === 0) log("r2", `${prefix}: ${sent} uploaded…`);
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker));
  log("r2", `${prefix}: ${sent} uploaded, ${skipped} unchanged (${files.length} files, ${(bytes / 1e6).toFixed(1)} MB gzipped)`);
}

/** Every level's values (values/<id>/[<stop>/]<level>.json, values/tracts/<county>.json), gzip-encoded. */
export const publishValues = (only?: string[]) => publishJson("values", "export", only);
/** Names, map points, the place search index and tract geography (geo/), gzip-encoded. */
export const publishGeo = () => publishJson("geo", "export` and `ingest tract-geo");
/** The state/county click details (details/, from `ingest details`), gzip-encoded. */
export const publishDetails = () => publishJson("details", "details");

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
