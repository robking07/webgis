// Upload data/tiles/*.pmtiles to Cloudflare R2 (D-01) and set the bucket CORS rule
// the browser needs for PMTiles range requests.
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { S3Client, PutBucketCorsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { log, TILES } from "./util.ts";

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
      AllowedOrigins: ["https://mapwich.org", "https://www.mapwich.org", "https://webgis-lac.vercel.app", "https://*.vercel.app", "http://localhost:3000"],
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

/** Upload static-only values (block groups, D-34) from data/tiles/values, gzip-encoded. */
export async function publishValues(only?: string[]) {
  const { s3, bucket } = r2();
  const root = join(TILES, "values");
  if (!existsSync(root)) throw new Error("no data/tiles/values; run `ingest acs-bg` first");
  let n = 0, bytes = 0;
  for (const id of readdirSync(root).filter((d) => !only || only.includes(d))) {
    for (const f of readdirSync(join(root, id))) {
      const body = gzipSync(readFileSync(join(root, id, f)));
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: `values/${id}/${f}`, Body: body, ContentType: "application/json", ContentEncoding: "gzip", CacheControl: "public, max-age=86400" }));
      n++; bytes += body.length;
    }
  }
  log("r2", `uploaded ${n} value files (${(bytes / 1e6).toFixed(1)} MB gzipped)`);
}
