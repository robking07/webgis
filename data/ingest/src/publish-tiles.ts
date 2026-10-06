// Upload data/tiles/*.pmtiles to Cloudflare R2 (D-01) and set the bucket CORS rule
// the browser needs for PMTiles range requests.
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { ListObjectsV2Command, S3Client, PutBucketCorsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
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

function walk(dir: string, rel = ""): string[] {
  return readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(dir, join(rel, e.name)) : e.name.endsWith(".json") ? [join(rel, e.name)] : []);
}

/** Upload every .json file under data/tiles/<prefix>/ (optionally only `dirs`, its top-level
 *  folders) to R2 under the same key. Files whose gzipped bytes match what R2 already holds (by
 *  ETag, the MD5 of a single-part upload) are skipped, so a re-run uploads only what changed. */
async function publishJson(prefix: string, hint: string, dirs?: string[]) {
  const { s3, bucket } = r2();
  const root = join(TILES, prefix);
  if (!existsSync(root)) throw new Error(`no data/tiles/${prefix}; run \`ingest ${hint}\` first`);
  const files = walk(root).filter((f) => !dirs || dirs.includes(f.split("/")[0]));
  const etags = new Map<string, string>();
  let token: string | undefined;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${prefix}/`, ContinuationToken: token }));
    for (const o of r.Contents ?? []) if (o.Key && o.ETag) etags.set(o.Key, o.ETag.replace(/"/g, ""));
    token = r.NextContinuationToken;
  } while (token);
  let sent = 0, skipped = 0, bytes = 0, next = 0;
  const worker = async () => {
    for (let i = next++; i < files.length; i = next++) {
      const key = `${prefix}/${files[i]}`;
      const body = gzipSync(readFileSync(join(root, files[i])));
      bytes += body.length;
      if (etags.get(key) === createHash("md5").update(body).digest("hex")) { skipped++; continue; }
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

/** `ingest publish-data`: everything the web reads beside the tiles, in one command (S2). */
export async function publishData(only?: string[]) {
  await publishValues(only);
  if (only) return;
  await publishGeo();
  if (existsSync(DETAILS_DIR)) await publishDetails();
}
