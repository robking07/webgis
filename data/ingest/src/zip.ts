// Read one entry of a zip as text (via the unzipper package already used for TIGER).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PassThrough, Readable } from "node:stream";
import unzipper from "unzipper";
import { CACHE } from "./util.ts";

export async function unzipEntry(path: string, name: RegExp): Promise<string> {
  const zip = await unzipper.Open.buffer(readFileSync(path));
  const f = zip.files.find((x) => name.test(x.path));
  if (!f) throw new Error(`${path}: no entry matching ${name}`);
  // Strip a UTF-8 byte-order mark (some FARS years have one; read as latin1 it's "ï»¿"),
  // otherwise the first column name doesn't match and its values silently go missing.
  return (await f.buffer()).toString("latin1").replace(/^(﻿|ï»¿)/, "");
}

/** One entry of a zip on a web server, cached in data/cache as `cacheName`. Only the zip's directory
 *  and that entry download, by HTTP range requests (BLS's QCEW zips are 35–145 MB; the entry ~4 MB). */
export async function remoteZipEntry(url: string, name: RegExp, cacheName: string, headers: Record<string, string> = {}): Promise<string> {
  const path = join(CACHE, cacheName);
  if (existsSync(path)) return readFileSync(path, "latin1");
  const get = async (range: string) => {
    const res = await fetch(url, { headers: { ...headers, Range: `bytes=${range}` } });
    if (res.status !== 206 || !res.body) throw new Error(`GET ${url} (bytes ${range}) → ${res.status}, expected 206`);
    return res;
  };
  const first = await get("0-0");
  await first.body!.cancel();
  const size = Number(first.headers.get("content-range")?.split("/")[1]);
  if (!size) throw new Error(`${url}: no size in content-range`);
  const source = {
    size: async () => size,
    // The 64 KB pad covers a local header whose extra field is longer than the directory's copy.
    stream: (offset: number, length?: number) => {
      const out = new PassThrough();
      get(`${offset}-${length ? Math.min(size, offset + length + 65536) - 1 : ""}`)
        .then((res) => Readable.fromWeb(res.body as never).pipe(out), (e) => out.destroy(e));
      return out;
    },
  };
  const zip = await unzipper.Open.custom(source as never);
  const f = zip.files.find((x) => name.test(x.path));
  if (!f) throw new Error(`${url}: no entry matching ${name}`);
  const text = (await f.buffer()).toString("latin1");
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, text, "latin1");
  return text;
}
