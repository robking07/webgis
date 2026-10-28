// MPO plan archive (#365): data/registry/mpo-plans.json lists each MPO's long-range plan, TIP, work
// plan and grants page. `ingest mpo-plans` re-checks every link, keeps a copy of each file in
// data/cache/mpo-plans/ (named by content hash, so old versions stay), and asks the Wayback Machine
// to snapshot links without a recent one. `ingest publish-mpo-plans [--dry-run]` uploads the copies
// to R2 under plans/. Sequential and slow on purpose: these are small public sites.
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { CACHE, log, ROOT } from "./util.ts";
import { r2 } from "./publish-tiles.ts";

export const CATALOG = join(ROOT, "data/registry/mpo-plans.json");
/** Kept copies. A link's `file` is relative to this folder here and to plans/ on R2. */
const ARCHIVE = join(CACHE, "mpo-plans");
const KEY_PREFIX = "plans/";
const UA = { "user-agent": "Mapwich-ingest/1.0 (+https://mapwich.org; archiving public MPO plans)" };
/** A Wayback snapshot younger than this is fresh enough; older ones get a new Save Page Now. */
const WAYBACK_MAX_AGE_DAYS = 90;
const PAUSE_MS = 5000;

export type Status = "ok" | "dead" | "cant-verify";
export interface Link {
  title?: string | null; url: string | null; date?: string; note?: string; host?: boolean;
  checked?: string; status?: Status; http?: number | string; type?: string; bytes?: number; sha256?: string; file?: string;
  wayback?: string | null;
}
interface Doc extends Link { parts?: Link[] }
interface Catalog { about: string; labels: Record<string, string>; mpos: Array<{ id: string; name: string; website: string; docs: Record<string, Doc> }> }

/** HTTP status (or network error code) → link status. Only a clear "gone" counts as dead: sites
 *  that block scripts (401/403/429, Cloudflare, 5xx, timeouts) may still work in a browser. */
export function classify(http: number | string): Status {
  if (typeof http === "number") {
    if (http === 202) return "cant-verify"; // bot challenge pages answer 202 with no file
    if (http >= 200 && http < 300) return "ok";
    if (http === 404 || http === 410) return "dead";
    return "cant-verify";
  }
  return http === "ENOTFOUND" ? "dead" : "cant-verify"; // ENOTFOUND: the domain no longer exists
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const extOf = (type: string) => (type.includes("pdf") ? "pdf" : type.includes("html") ? "html" : type.includes("word") ? "docx" : "bin");
const errCode = (e: unknown) => String((e as { cause?: { code?: string } }).cause?.code ?? (e as Error).name ?? "error");

/** GET the link, keep the body as data/cache/mpo-plans/<mpo>/<name>-<sha8>.<ext>, record the result.
 *  A link that stops working keeps its last good copy (file, bytes, sha256). */
async function check(link: Link, mpo: string, name: string) {
  if (!link.url) return;
  link.checked = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch(link.url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(300_000) });
    link.http = res.status;
    link.status = classify(res.status);
    if (link.status !== "ok") { await res.body?.cancel(); return; }
    // shortcut: a 200 "soft 404" or parked-domain page counts as ok; the lead's hand check catches those until a content check is worth it.
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    // shortcut: whole file in memory (largest today 127 MB); stream to disk if a plan passes ~1 GB.
    const buf = Buffer.from(await res.arrayBuffer());
    const sha256 = createHash("sha256").update(buf).digest("hex");
    const file = `${mpo}/${name}-${sha256.slice(0, 8)}.${extOf(type)}`;
    mkdirSync(join(ARCHIVE, mpo), { recursive: true });
    writeFileSync(join(ARCHIVE, file), buf);
    Object.assign(link, { type, bytes: buf.length, sha256, file });
  } catch (e) {
    link.http = errCode(e);
    link.status = classify(link.http);
  }
}

/** Newest 200 snapshot of `url` in the Wayback Machine, as [timestamp, snapshot url]. */
async function latestSnapshot(url: string): Promise<[string, string] | undefined> {
  const q = new URLSearchParams({ url, limit: "-1", filter: "statuscode:200", output: "json", fl: "timestamp" });
  const res = await fetch(`https://web.archive.org/cdx/search/cdx?${q}`, { headers: UA, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) return undefined;
  const rows = (await res.json().catch(() => [])) as string[][];
  const ts = rows[1]?.[0];
  return ts ? [ts, `https://web.archive.org/web/${ts}/${url}`] : undefined;
}
const ageDays = (ts: string) => (Date.now() - Date.UTC(+ts.slice(0, 4), +ts.slice(4, 6) - 1, +ts.slice(6, 8))) / 864e5;

/** Record a recent Wayback snapshot, asking Save Page Now (anonymous) for one if none is recent. */
async function wayback(link: Link) {
  if (!link.url || link.status === "dead") return; // a dead link keeps the snapshot it had
  const have = await latestSnapshot(link.url).catch(() => undefined);
  if (have && ageDays(have[0]) <= WAYBACK_MAX_AGE_DAYS) { link.wayback = have[1]; return; }
  for (let attempt = 0; attempt < 2; attempt++) {
    await sleep(PAUSE_MS);
    try {
      const res = await fetch(`https://web.archive.org/save/${link.url}`, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(180_000) });
      await res.body?.cancel();
      if (res.status === 429) { log("mpo-plans", "Wayback rate limit; waiting 60 s"); await sleep(60_000); continue; }
      const m = `${res.headers.get("content-location") ?? ""} ${res.url}`.match(/\/web\/(\d{14})/);
      if (res.ok && m) { link.wayback = `https://web.archive.org/web/${m[1]}/${link.url}`; return; }
    } catch { /* timeout: Save Page Now often finishes anyway; look again below */ }
    break;
  }
  await sleep(PAUSE_MS);
  link.wayback = (await latestSnapshot(link.url).catch(() => undefined))?.[1] ?? have?.[1] ?? null;
}

const readCatalog = () => JSON.parse(readFileSync(CATALOG, "utf8")) as Catalog;
/** Every link in the catalog as [mpo id, file name stem, link]: each document, then its parts. */
function* links(c: Catalog): Generator<[string, string, Link]> {
  for (const m of c.mpos) for (const kind of Object.keys(c.labels)) {
    const doc = m.docs[kind];
    if (!doc) continue;
    yield [m.id, kind, doc];
    for (const [i, p] of (doc.parts ?? []).entries()) yield [m.id, `${kind}-${i + 1}`, p];
  }
}

/** `ingest mpo-plans`: check, download and snapshot every link; writes the results back into the catalog. */
export async function checkMpoPlans() {
  const c = readCatalog();
  const all = [...links(c)].filter(([, , l]) => l.url);
  for (const [i, [mpo, name, link]] of all.entries()) {
    await check(link, mpo, name);
    await wayback(link);
    log("mpo-plans", `${i + 1}/${all.length} ${mpo} ${name}: ${link.status} (${link.http})${link.bytes ? `, ${(link.bytes / 1e6).toFixed(1)} MB` : ""}, wayback ${link.wayback ? "yes" : "no"}`);
    writeFileSync(CATALOG, `${JSON.stringify(c, null, 1)}\n`); // after each link, so a crash loses nothing
  }
  const n = (s: string) => all.filter(([, , l]) => l.status === s).length;
  const mb = all.reduce((t, [, , l]) => t + (l.bytes ?? 0), 0) / 1e6;
  log("mpo-plans", `${all.length} links: ${n("ok")} ok, ${n("dead")} dead, ${n("cant-verify")} can't verify; ${mb.toFixed(1)} MB in data/cache/mpo-plans`);
}

/** `ingest publish-mpo-plans [--dry-run]`: upload the kept copies to R2 under plans/. A link that has
 *  since gone dead still uploads its last good copy. Only documents (PDF, Word) go up: web pages and
 *  other types stay Wayback-only (another site's HTML or SVG served from our domain would run its
 *  scripts there), as do links marked `"host": false`.
 *  Keys carry the content hash, so keys already on R2 are skipped. */
export async function publishMpoPlans(dryRun: boolean) {
  const files = [...links(readCatalog())].map(([, , l]) => l).filter((l) => l.file && l.host !== false && /\.(pdf|docx)$/.test(l.file));
  const missing = files.filter((l) => !existsSync(join(ARCHIVE, l.file!)));
  if (missing.length) throw new Error(`${missing.length} files not in data/cache/mpo-plans (first: ${missing[0].file}); run \`ingest mpo-plans\` first`);
  const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
  if (dryRun) {
    for (const l of files) log("publish-mpo-plans", `would upload ${KEY_PREFIX}${l.file} (${mb(statSync(join(ARCHIVE, l.file!)).size)})`);
    log("publish-mpo-plans", `dry run: ${files.length} files, ${mb(files.reduce((t, l) => t + l.bytes!, 0))}; nothing sent`);
    return;
  }
  const { s3, bucket } = r2();
  const have = new Set<string>();
  let token: string | undefined;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: KEY_PREFIX, ContinuationToken: token }));
    for (const o of r.Contents ?? []) if (o.Key) have.add(o.Key);
    token = r.NextContinuationToken;
  } while (token);
  let sent = 0; // ContentType comes from the extension, never the source server's header
  for (const l of files) {
    const key = KEY_PREFIX + l.file;
    if (have.has(key)) continue;
    await new Upload({ client: s3, params: { Bucket: bucket, Key: key, Body: createReadStream(join(ARCHIVE, l.file!)),
      ContentType: l.file!.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document", CacheControl: "public, max-age=31536000, immutable" } }).done();
    sent++;
  }
  log("publish-mpo-plans", `${sent} uploaded, ${files.length - sent} already on R2`);
}
