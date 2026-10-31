// #368, D-<n>: keep what a Data run downloaded. The GitHub runner's data/cache/ dies with the job, so
// copy it to R2 under raw/ (same relative path). Never overwrites, never deletes.
import { createReadStream, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { HeadObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { CACHE, log } from "./util.ts";
import { r2 } from "./publish-tiles.ts";

/** raw/<path>; a path with no year in it (no release in its name) gets the run date before its extension. */
export function rawKey(rel: string, date: string, dated = false): string {
  if (!dated && /(19|20)\d{2}/.test(rel)) return `raw/${rel}`;
  const ext = extname(rel);
  return `raw/${rel.slice(0, rel.length - ext.length)}.${date}${ext}`;
}

// Half-written downloads and tippecanoe scratch are not source files.
const skip = (rel: string) => rel.endsWith(".part") || rel.startsWith("tippecanoe-tmp/");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

type Client = { head: (key: string) => Promise<number | null>; put: (key: string, path: string) => Promise<void> };

/** Upload each cache file not already saved; returns [saved, kept]. */
export async function saveRaw(files: string[], root: string, date: string, c: Client): Promise<[number, number]> {
  let saved = 0, kept = 0;
  for (const f of files) {
    const rel = relative(root, f).split("\\").join("/");
    if (skip(rel)) continue;
    let key = rawKey(rel, date);
    const size = await c.head(key);
    if (size === statSync(f).size) { kept++; continue; }
    // shortcut: size is the only "same file" test (no checksum); a source that re-issues a release at the
    // same size is missed. Upgrade to an ETag compare if one ever does.
    // A different file under an existing key is a re-issued release: keep both, the new one under today's date.
    if (size !== null) {
      key = rawKey(rel, date, true);
      if ((await c.head(key)) === statSync(f).size) { kept++; continue; }
    }
    await c.put(key, f);
    saved++;
  }
  return [saved, kept];
}

export async function publishRaw() {
  try {
    const { s3, bucket } = r2();
    const client: Client = {
      head: (Key) => s3.send(new HeadObjectCommand({ Bucket: bucket, Key })).then((r) => r.ContentLength ?? null, () => null),
      // Upload streams large files in parts from disk.
      put: (Key, path) => new Upload({ client: s3 as S3Client, params: { Bucket: bucket, Key, Body: createReadStream(path) } }).done().then(() => {}),
    };
    const [saved, kept] = await saveRaw(walk(CACHE), CACHE, new Date().toISOString().slice(0, 10), client);
    log("publish-raw", `saved ${saved} raw download(s) to R2 under raw/, ${kept} already there`);
  } catch (e) {
    // Never fails a run that already published.
    console.log(`::warning::raw downloads were not saved to R2: ${(e as Error).message}`);
  }
}
