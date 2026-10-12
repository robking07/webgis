// "Why this matters" loader (issue #115, D-<see docs/decisions>). Node-only: runs in scripts/prepare.mts
// before every dev and build, reads content/context/<dataset id>.yaml, checks each file, and writes
// src/generated/context.json. A mistake fails the build with a message naming the file.
// Format: the decision file docs/decisions/D-*-why-this-matters.md. Relative imports only: plain Node runs this.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

/** How the context talks about the map (review lead, #104). */
export const FRAMINGS = {
  /** Deaths or injuries that proven measures prevent (traffic deaths). */
  "preventable-harm": "What's behind it",
  /** A behavior "linked to" outcomes (smoking, obesity, inactivity, binge drinking). */
  "risk-factor": "What it's linked to",
  /** "More common among": structural causes, never blaming; never called preventable. */
  disparity: "Who is affected more",
} as const;
export type Framing = keyof typeof FRAMINGS;

export interface ContextSource { title: string; url: string; quotes: string[] }

export interface MapContext {
  /** The registry dataset id (the file name). */
  id: string;
  /** Robbie approved the text as it stands. Only approved context reaches mapwich.org. */
  approved: boolean;
  framing: Framing;
  /** The points' heading, from the framing. */
  heading: string;
  /** ISO dates: when the facts were last checked against the sources, and when to check again. */
  reviewed: string;
  review_by: string;
  /** Two or three sentences. `[n]` cites sources[n-1]. */
  summary: string[];
  /** The list under the framing's heading. */
  points: string[];
  /** Related maps on Mapwich, with a neutral reason. */
  linked: { id: string; why: string }[];
  sources: ContextSource[];
}

const CITE = /\[(\d+)\]/g;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MONTHS = 18;

/** Digits in the text a reader sees ("40,901", "29", "2023"), citation markers left out.
 *  shortcut: numbers written as words ("one in five") aren't checked; keep figures in digits. */
export const numbersIn = (text: string) =>
  [...text.replace(CITE, "").matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0].replace(/,+$/, ""));

/** The quote has this number as a whole token: "40,901" matches "to 40,901 in", not "140,901". */
export const quoteHas = (quote: string, n: string) =>
  new RegExp(`(?<![\\d.,])${n.replace(/[.,]/g, "\\$&")}(?![\\d]|[.,]\\d)`).test(quote);

const addMonths = (iso: string, m: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + m);
  return d.toISOString().slice(0, 10);
};

/** Check one file's parsed YAML. Returns the context and any warnings; throws on a mistake. */
export function checkContext(id: string, raw: unknown, datasetIds: Set<string>, today = new Date().toISOString().slice(0, 10)): { ctx: MapContext; warnings: string[] } {
  const file = `content/context/${id}.yaml`;
  const fail = (msg: string): never => { throw new Error(`${file}: ${msg}`); };
  if (!datasetIds.has(id)) fail(`no registry dataset with id "${id}" (the file name must be a dataset id)`);
  const r = (raw ?? {}) as Record<string, unknown>;
  const known = new Set(["approved", "framing", "reviewed", "review_by", "summary", "points", "linked", "sources"]);
  for (const k of Object.keys(r)) if (!known.has(k)) fail(`unknown field "${k}"`);
  if (typeof r.approved !== "boolean") fail("approved must be true or false");
  if (typeof r.framing !== "string" || !(r.framing in FRAMINGS)) fail(`framing must be one of ${Object.keys(FRAMINGS).join(", ")}`);
  for (const k of ["reviewed", "review_by"] as const) if (typeof r[k] !== "string" || !DATE.test(r[k] as string)) fail(`${k} must be a quoted date like "2026-10-12"`);
  const reviewed = r.reviewed as string, reviewBy = r.review_by as string;
  if (reviewBy <= reviewed || reviewBy > addMonths(reviewed, MAX_MONTHS)) fail(`review_by must be after reviewed and at most ${MAX_MONTHS} months later (by ${addMonths(reviewed, MAX_MONTHS)})`);
  const strings = (k: string, min: number) => {
    const v = r[k];
    if (!Array.isArray(v) || v.length < min || !v.every((s) => typeof s === "string" && s.trim())) fail(`${k} must be a list of at least ${min} non-empty text line(s)`);
    return (v as string[]).map((s) => s.trim());
  };
  const summary = strings("summary", 1), points = strings("points", 1);
  if (!Array.isArray(r.sources) || !r.sources.length) fail("sources must list at least one source");
  const sources = (r.sources as Record<string, unknown>[]).map((s, i) => {
    const where = `source ${i + 1}`;
    if (typeof s?.title !== "string" || !s.title.trim()) fail(`${where} needs a title`);
    if (typeof s.url !== "string" || !/^https:\/\/\S+$/.test(s.url)) fail(`${where} needs an https url`);
    if (!Array.isArray(s.quotes) || !s.quotes.length || !s.quotes.every((q) => typeof q === "string" && q.trim())) fail(`${where} needs at least one verbatim quote`);
    return { title: s.title as string, url: s.url as string, quotes: s.quotes as string[] };
  });
  const cited = new Set<number>();
  for (const line of [...summary, ...points]) {
    const refs = [...line.matchAll(CITE)].map((m) => Number(m[1]));
    if (!refs.length) fail(`every line cites a source with [n]: "${line}"`);
    for (const n of refs) { if (n < 1 || n > sources.length) fail(`[${n}] points at no source: "${line}"`); cited.add(n); }
    // Every number must be backed by a quote from a source this line cites (review lead, #104).
    const quotes = refs.flatMap((n) => sources[n - 1].quotes);
    for (const n of numbersIn(line)) if (!quotes.some((q) => quoteHas(q, n))) fail(`"${n}" is in no quote of the source(s) it cites: "${line}"`);
    // Robbie (2026-10-06): disparity maps are never called preventable.
    if (r.framing === "disparity" && /preventab/i.test(line)) fail(`a disparity map is never called preventable: "${line}"`);
  }
  sources.forEach((_, i) => { if (!cited.has(i + 1)) fail(`source ${i + 1} is never cited`); });
  const linked = (r.linked ?? []) as Record<string, unknown>[];
  if (!Array.isArray(linked)) fail("linked must be a list");
  for (const l of linked) {
    if (typeof l?.id !== "string" || !datasetIds.has(l.id) || l.id === id) fail(`linked map "${String(l?.id)}" isn't another dataset in the registry`);
    if (typeof l.why !== "string" || !l.why.trim()) fail(`linked map "${l.id}" needs a short neutral reason (why)`);
  }
  const warnings = today > reviewBy ? [`${file}: review_by ${reviewBy} has passed; check the numbers against the sources again`] : [];
  return {
    ctx: { id, approved: r.approved as boolean, framing: r.framing as Framing, heading: FRAMINGS[r.framing as Framing], reviewed, review_by: reviewBy, summary, points, linked: linked as MapContext["linked"], sources },
    warnings,
  };
}

/** Every content/context/*.yaml, checked. `drafts: false` (production) leaves out unapproved ones. */
export function loadContexts(appDir: string, datasetIds: Set<string>, drafts: boolean): { contexts: MapContext[]; warnings: string[] } {
  let files: string[];
  try { files = readdirSync(join(appDir, "content/context")).filter((f) => f.endsWith(".yaml")).sort(); } catch { return { contexts: [], warnings: [] }; }
  const all = files.map((f) => checkContext(f.slice(0, -5), parseYaml(readFileSync(join(appDir, "content/context", f), "utf8")), datasetIds));
  return { contexts: all.map((c) => c.ctx).filter((c) => drafts || c.approved), warnings: all.flatMap((c) => c.warnings) };
}
