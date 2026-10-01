// Upload data/tiles/*.pmtiles to Cloudflare R2 (D-01) and set the bucket CORS rule
// the browser needs for PMTiles range requests.
import { createReadStream, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { log, TILES } from "./util.ts";

export async function publishTiles(only?: string[]) {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) throw new Error("R2_* settings missing in .env.local");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    maxAttempts: 8, // retries with backoff; large multipart uploads hit transient timeouts
  });
  await s3.send(new PutBucketCorsCommand({
    Bucket: R2_BUCKET,
    CORSConfiguration: { CORSRules: [{
      AllowedOrigins: ["https://webgis-lac.vercel.app", "https://*.vercel.app", "http://localhost:3000"],
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
