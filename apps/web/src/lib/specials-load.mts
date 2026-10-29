// Specials loader (D-115, D-122). Node-only: runs in scripts/prepare.mts before every dev and build,
// reads content/specials/*.md, checks the frontmatter and inline blocks against the registry and the
// Combinations, computes the charts and tables from the exported values, and writes
// src/generated/specials.json. Any mistake fails the build with a message naming the file.
// Doing this before the build (not inside a page) means a page re-rendered on the server later
// never needs content/ or the value files on disk.
// Format and fields: content/specials/README.md. Relative .ts imports only: plain Node runs this.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { marked } from "marked";
import type { DatasetEntry } from "@webgis/registry";
import { blockDatasets, blockWords, parseBlock, setBlockContext, type Block } from "./special-blocks.mts";

/** The body in reading order: Markdown rendered to HTML, and inline maps, charts and tables (D-122). */
export type Segment = { kind: "html"; html: string } | Block;

export interface Special {
  slug: string;
  title: string;
  /** One or two sentences under the headline. */
  dek: string;
  topic: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  author: string;
  /** One dataset (a choropleth) or two (a bivariate map), all mapped by county. */
  datasets: [string] | [string, string];
  /** The Combination this started from, if any. */
  pairing: string | null;
  /** Map position for the piece's map and "Open this map"; null = the national view. */
  at: { lon: number; lat: number; zoom: number } | null;
  /** Caption under the map; null = a plain description of what's mapped. */
  caption: string | null;
  /** Extra method notes for "How this was made" (Markdown). */
  method: string | null;
  /** Thumbnail for the Earlier Specials cards and link previews (a path under public/). */
  image: string | null;
  draft: boolean;
  /** The body: prose and inline blocks, in order. */
  body: Segment[];
  /** Every dataset the piece uses (main map first, then its maps, charts and tables), for the sources list. */
  allDatasets: string[];
  /** Words a reader reads: the prose plus the inline blocks' titles and captions. */
  words: number;
  /** Reading time at 230 words a minute. */
  minutes: number;
}

interface PairingRef { id: string; status: string }

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// ```map / ```chart / ```table fences with YAML inside; everything else is Markdown.
const FENCE = /^```(map|chart|table)[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm;

function fail(file: string, msg: string): never {
  throw new Error(`content/specials/${file}: ${msg}`);
}

/** `firstLine`: the file line the body starts on, so messages point at the right line. */
function parseBody(file: string, body: string, firstLine: number) {
  const out: Array<{ kind: "html"; html: string; words: number } | Block> = [];
  const prose = (md: string) => {
    if (!md.trim()) return;
    out.push({ kind: "html", html: marked.parse(md, { async: false }).replace(/<table>[\s\S]*?<\/table>/g, (t) => `<div class="wg-table-scroll" role="region" aria-label="Table" tabindex="0">${t}</div>`), words: md.split(/\s+/).filter(Boolean).length });
  };
  let last = 0, n = 0;
  for (const m of body.matchAll(FENCE)) {
    prose(body.slice(last, m.index));
    n++;
    const where = `the ${m[1]} block at line ${firstLine + body.slice(0, m.index).split("\n").length - 1} (inline block ${n})`;
    out.push(parseBlock(m[1], m[2], (msg) => fail(file, `${where}: ${msg}`), (md) => marked.parseInline(md, { async: false })));
    last = m.index + m[0].length;
  }
  prose(body.slice(last));
  // An unclosed fence would otherwise swallow the rest of the text as a code block.
  if (/^```(map|chart|table)\b/m.test(body.replace(FENCE, ""))) fail(file, "a ```map, ```chart or ```table block is missing its closing ```");
  return out;
}

function parseFile(appDir: string, byId: Map<string, DatasetEntry>, pairings: PairingRef[], file: string): Special {
  const raw = readFileSync(join(appDir, "content/specials", file), "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) fail(file, "missing the --- frontmatter block at the top");
  const fm = (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
  const body = m[2];
  const slug = file.replace(/\.md$/, "");
  if (!SLUG.test(slug)) fail(file, "file name must be lower-case words joined by hyphens");

  const str = (k: string, required = true): string | null => {
    const v = fm[k];
    if (v == null || v === "") { if (required) fail(file, `"${k}" is required`); return null; }
    if (typeof v !== "string") fail(file, `"${k}" must be text`);
    return v.trim();
  };
  const title = str("title")!, dek = str("dek")!, topic = str("topic")!;
  // YAML reads an unquoted 2026-10-01 as a date.
  const d = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : str("date");
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) fail(file, `"date" must look like 2026-10-01`);

  const datasets = fm.datasets;
  if (!Array.isArray(datasets) || datasets.length < 1 || datasets.length > 2) fail(file, `"datasets" must list one or two dataset ids`);
  for (const id of datasets) {
    const ds = byId.get(String(id));
    if (!ds) fail(file, `unknown dataset "${id}" (see data/registry/datasets/)`);
    if (!ds.geographyLevels.includes("county")) fail(file, `"${id}" has no county values; Specials maps are by county`);
  }

  const pairing = str("pairing", false);
  if (pairing && !pairings.some((i) => i.id === pairing && i.status === "published")) fail(file, `"pairing" ${pairing} is not a published Combination`);

  let at: Special["at"] = null;
  if (fm.at != null) {
    const a = fm.at;
    if (!Array.isArray(a) || a.length !== 3 || !a.every((n) => typeof n === "number")) fail(file, `"at" must be [longitude, latitude, zoom]`);
    at = { lon: a[0], lat: a[1], zoom: a[2] };
  }

  const image = str("image", false);
  if (image && (!image.startsWith("/") || !existsSync(join(appDir, "public", image)))) fail(file, `"image" ${image} is not a file in apps/web/public/ (write it as /specials/name.png)`);

  const segments = parseBody(file, body, raw.length === body.length ? 1 : raw.slice(0, raw.length - body.length).split("\n").length);
  const words = segments.reduce((t, sg) => t + (sg.kind === "html" ? sg.words : blockWords(sg)), 0);
  const allDatasets = [...new Set([...datasets.map(String), ...segments.flatMap((sg) => (sg.kind === "html" ? [] : blockDatasets(sg)))])];
  return {
    slug, title, dek, topic, date: d,
    author: str("author", false) ?? "Robbie King",
    datasets: datasets.map(String) as Special["datasets"],
    pairing, at,
    caption: str("caption", false),
    method: str("method", false),
    image,
    draft: fm.draft === true,
    body: segments.map((sg) => (sg.kind === "html" ? { kind: "html" as const, html: sg.html } : sg)),
    allDatasets, words,
    minutes: Math.max(1, Math.round(words / 230)),
  };
}

/** Every piece, drafts included, newest first. The app leaves drafts out on mapwich.org. */
export function loadSpecials(appDir: string, registry: DatasetEntry[], pairings: PairingRef[], readData: (path: string) => unknown): Special[] {
  const byId = new Map(registry.map((d) => [d.id, d]));
  setBlockContext({ byId, appDir, readData });
  let files: string[];
  try { files = readdirSync(join(appDir, "content/specials")).filter((f) => f.endsWith(".md") && f !== "README.md" && f !== "BRIEF.md"); } catch { return []; }
  const all = files.map((f) => parseFile(appDir, byId, pairings, f));
  // Pieces and Combinations share /specials/<id>; a clash would hide one of them.
  // "combinations" is the Combinations list page (the old "pairings" URL redirects to it); "review" is the review page.
  const taken = new Set([...pairings.map((i) => i.id), "pairings", "combinations", "review"]);
  for (const s of all) if (taken.has(s.slug)) fail(`${s.slug}.md`, "file name matches a Combination id or a Specials page; rename it");
  return all.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
