// Specials: Robbie's pieces, one Markdown file each in apps/web/content/specials/ (D-113).
// Read at build time only (server components). Frontmatter is checked against the registry and the
// Odd Pairings, and any mistake fails the build, so a typo can't publish a broken page.
// Format and fields: content/specials/README.md.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { marked } from "marked";
import { DATASET_BY_ID } from "./registry";
import { INSIGHTS } from "./insights";

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
  /** The Odd Pairing this started from, if any. */
  pairing: string | null;
  /** Map position for the piece's map and "Open this map"; null = the national view. */
  at: { lon: number; lat: number; zoom: number } | null;
  /** Caption under the map; null = a plain description of what's mapped. */
  caption: string | null;
  /** Extra method notes for "How this was made" (Markdown). */
  method: string | null;
  /** Thumbnail for the Earlier Specials cards (a path under public/). */
  image: string | null;
  draft: boolean;
  /** The body, rendered to HTML. */
  html: string;
  minutes: number;
}

const DIR = join(process.cwd(), "content/specials");
// Drafts show in local builds and Vercel previews, never on mapwich.org.
const SHOW_DRAFTS = process.env.VERCEL_ENV !== "production";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(file: string, msg: string): never {
  throw new Error(`content/specials/${file}: ${msg}`);
}

function parseFile(file: string): Special {
  const raw = readFileSync(join(DIR, file), "utf8");
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
    const ds = DATASET_BY_ID.get(String(id));
    if (!ds) fail(file, `unknown dataset "${id}" (see data/registry/datasets/)`);
    if (!ds.geographyLevels.includes("county")) fail(file, `"${id}" has no county values; Specials maps are by county`);
  }

  const pairing = str("pairing", false);
  if (pairing && !INSIGHTS.some((i) => i.id === pairing && i.status === "published")) fail(file, `"pairing" ${pairing} is not a published Odd Pairing`);

  let at: Special["at"] = null;
  if (fm.at != null) {
    const a = fm.at;
    if (!Array.isArray(a) || a.length !== 3 || !a.every((n) => typeof n === "number")) fail(file, `"at" must be [longitude, latitude, zoom]`);
    at = { lon: a[0], lat: a[1], zoom: a[2] };
  }

  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug, title, dek, topic, date: d,
    author: str("author", false) ?? "Robbie King",
    datasets: datasets.map(String) as Special["datasets"],
    pairing, at,
    caption: str("caption", false),
    method: str("method", false),
    image: str("image", false),
    draft: fm.draft === true,
    html: marked.parse(body, { async: false }),
    minutes: Math.max(1, Math.round(words / 230)),
  };
}

function load(): Special[] {
  let files: string[];
  try { files = readdirSync(DIR).filter((f) => f.endsWith(".md") && f !== "README.md"); } catch { return []; }
  const all = files.map(parseFile);
  // Pieces and Odd Pairings share /specials/<id>; a clash would hide one of them.
  const pairingIds = new Set(INSIGHTS.map((i) => i.id));
  for (const s of all) if (pairingIds.has(s.slug)) fail(`${s.slug}.md`, "file name matches an Odd Pairing id; rename it");
  return all.filter((s) => SHOW_DRAFTS || !s.draft).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

/** Newest first. Drafts are left out of production builds. */
export const SPECIALS: Special[] = load();

/** Markdown → HTML for short fields (method notes). */
export const renderMarkdown = (md: string) => marked.parse(md, { async: false });

export function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
