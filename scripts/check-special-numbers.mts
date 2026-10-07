// Numbers check for a Special (roadmap 1.8, issue #125): `npm run check:special -- <slug>`.
// Parses apps/web/content/specials/<slug>.md with the site's own parser (specials-load.mts), then ties
// the figures in the prose to data and reports each as MATCH, ROUNDING (off by one in the last
// written digit), MISMATCH (close to a real value but not equal: probably a typo) or UNVERIFIED
// (could not be tied to a dataset, place and level: check by hand). Nothing is passed silently.
//
// What it can tie: a % or $ figure in a sentence that names a county (the dataset is whichever of the
// piece's datasets, at county level, has a value there that fits); a % figure that equals a group
// average or edge in one of the piece's charts; a decimal such as -0.62 that equals a rank correlation in
// one of its tables. Everything else (state values, counts, ranges, outside facts) is listed as
// unverified. Values come from the tiles base (NEXT_PUBLIC_TILES_BASE_URL, else https://tiles.mapwich.org),
// the same files the site reads (D-210), so it needs no .env.local and no database.
// Exit code: 1 if anything is a MISMATCH or ROUNDING, else 0 (unverified figures never fail the run,
// but they are always printed).
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { loadRegistry } from "@webgis/registry/load";
import { loadSpecials } from "../apps/web/src/lib/specials-load.mts";
import type { Block, Ref } from "../apps/web/src/lib/special-blocks.mts";

process.env.NEXT_PUBLIC_TILES_BASE_URL ||= "https://tiles.mapwich.org";
const { staticUrl } = await import("../apps/web/src/lib/static-files.ts");

const slug = process.argv.slice(2).find((a) => !a.startsWith("-"))?.replace(/\.md$/, "");
if (!slug) { console.error("usage: npm run check:special -- <slug>   (a file name in apps/web/content/specials/)"); process.exit(2); }
const app = join(dirname(fileURLToPath(import.meta.url)), "../apps/web");
const file = join(app, "content/specials", `${slug}.md`);
if (!existsSync(file)) { console.error(`no such Special: apps/web/content/specials/${slug}.md`); process.exit(2); }

// Values from the tiles base (cached; the parser is synchronous, so a missing file is fetched and the pass re-run).
const fetched = new Map<string, unknown>();
class NeedFile extends Error { path: string; constructor(path: string) { super(path); this.path = path; } }
const readData = (path: string): unknown => { if (fetched.has(path)) return fetched.get(path); throw new NeedFile(path); };
async function getFile(path: string) {
  if (!fetched.has(path)) {
    const r = await fetch(staticUrl(path));
    if (!r.ok && r.status !== 404 && r.status !== 403) throw new Error(`${staticUrl(path)} → ${r.status}`);
    fetched.set(path, r.ok ? await r.json() : null);
  }
  return fetched.get(path);
}
const countyPath = (r: { id: string; stop: string | null }) => ["values", r.id, ...(r.stop ? [r.stop] : []), "county.json"].join("/");
const key = (r: { id: string; stop: string | null }) => `${r.id}${r.stop ? "@" + r.stop : ""}`;

const entries = loadRegistry();
const insights = JSON.parse(readFileSync(join(app, "src/generated/insights.json"), "utf8")).insights;
let special!: ReturnType<typeof loadSpecials>[number];
for (;;) {
  try { special = loadSpecials(app, entries, insights, readData).find((s) => s.slug === slug)!; break; } catch (e) {
    if (!(e instanceof NeedFile)) throw e;
    await getFile(e.path);
  }
}

// What the piece references.
const names = JSON.parse(readFileSync(join(app, "src/generated/names.json"), "utf8")) as Record<string, string>;
const blocks = special.body.filter((s): s is Block => s.kind !== "html");
const refOf = (id: string): Ref => ({ id, stop: null, title: id, unit: entries.find((d) => d.id === id)!.unit as Ref["unit"], period: null });
const allRefs = new Map<string, Ref>();
const addRef = (r: Ref) => allRefs.set(key(r), r);
for (const id of special.allDatasets) addRef(refOf(id));
for (const b of blocks) {
  if (b.kind === "bins") { addRef(b.x); addRef(b.y); }
  if (b.kind === "correlations") { b.rows.forEach((r) => addRef(r.ref)); b.with.forEach(addRef); }
  if (b.kind === "counties") b.columns.forEach(addRef);
}
const values = new Map<string, Record<string, number>>();
for (const [k, r] of allRefs) values.set(k, ((await getFile(countyPath(r))) ?? {}) as Record<string, number>);

// Block checks: every named county has a value in every column, and the page's value is the data's.
const lines = { match: [] as string[], rounding: [] as string[], mismatch: [] as string[], unverified: [] as string[], notes: [] as string[] };
const blockGeoids = new Set<string>();
for (const b of blocks) {
  if (b.kind === "counties") {
    for (const row of b.rows) {
      blockGeoids.add(row.geoid);
      b.columns.forEach((c, i) => {
        const v = values.get(key(c))?.[row.geoid];
        if (v == null) lines.mismatch.push(`table "${b.title}": ${row.name} has no county value for ${c.id}`);
        else if (v !== row.values[i]) lines.mismatch.push(`table "${b.title}": ${row.name} ${c.id} is ${row.values[i]} on the page, ${v} in the data`);
      });
    }
    lines.notes.push(`table "${b.title}": ${b.rows.length} counties x ${b.columns.length} datasets checked against the tiles base`);
  } else if (b.kind === "bins") {
    lines.notes.push(`chart "${b.title}": ${b.n} counties with both ${b.x.id} and ${b.y.id}, ${b.rows.length} groups`);
  } else if (b.kind === "correlations") {
    lines.notes.push(`table "${b.title}": ${b.rows.length} x ${b.with.length} rank correlations`);
  } else lines.notes.push(`map: ${b.datasets.join(" + ")} at ${b.at.lon}, ${b.at.lat} (${b.level}); not a number claim`);
}

// The prose: dek, caption, block titles and captions, and the body text.
const raw = readFileSync(file, "utf8");
const fm = (parseYaml(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1]) ?? {}) as Record<string, unknown>;
const bodyMd = raw.replace(/^---[\s\S]*?\r?\n---\r?\n?/, "");
const FENCE = /^```(map|chart|table)[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm;
const paragraphs: Array<{ where: string; text: string }> = [];
for (const k of ["dek", "caption"]) if (typeof fm[k] === "string") paragraphs.push({ where: `frontmatter ${k}`, text: fm[k] as string });
for (const m of bodyMd.matchAll(FENCE)) {
  const y = (parseYaml(m[2]) ?? {}) as Record<string, unknown>;
  for (const k of ["title", "caption"]) if (typeof y[k] === "string") paragraphs.push({ where: `${m[1]} block ${k}`, text: y[k] as string });
}
for (const p of bodyMd.replace(FENCE, "\n\n").split(/\n\s*\n/)) if (p.trim()) paragraphs.push({ where: p.trim().startsWith("#") ? "heading" : "text", text: p.trim() });

const strip = (s: string) => s.replace(/\]\([^)]*\)/g, "]").replace(/[*_`#]/g, "").replace(/\[([^\]]*)\]/g, "$1").replace(/\s+/g, " ").trim();
const stateByName = new Map<string, string>();
for (const [k, v] of Object.entries(names)) if (k.length === 2) stateByName.set(v, k);
const stateByAbbr = new Map<string, string>();
for (const [k, v] of Object.entries(names)) if (k.length === 5) stateByAbbr.set(v.split(", ").pop()!, k.slice(0, 2));
const shortName = new Map<string, string[]>(); // "Arlington County" -> geoids
for (const [k, v] of Object.entries(names)) if (k.length === 5) { const s = v.replace(/, [A-Z]{2}$/, ""); shortName.set(s, [...(shortName.get(s) ?? []), k]); }
const shortNames = [...shortName.keys()].sort((a, b) => b.length - a.length);

interface Num { text: string; value: number; unit: "%" | "$" | "ρ"; ulp: number }
function numbers(s: string): Num[] {
  const out: Num[] = [];
  for (const m of s.matchAll(/(\$)?([−-])?(\d+(?:,\d{3})*(?:\.\d+)?|\.\d+)(%)?/g)) {
    const digits = m[3].replace(/,/g, ""), dec = digits.includes(".") ? digits.split(".")[1].length : 0;
    const value = Number(digits) * (m[2] ? -1 : 1);
    const unit = m[1] ? "$" : m[4] ? "%" : dec >= 2 && Math.abs(value) < 1 ? "ρ" : null;
    if (!unit) continue;
    const tz = dec ? 0 : Math.min(3, digits.match(/0+$/)?.[0].length ?? 0);
    out.push({ text: m[0], value, unit, ulp: dec ? 10 ** -dec : 10 ** tz });
  }
  return out;
}
const unitOf = (u: Num["unit"]) => (u === "%" ? "percent" : "dollars");
const fits = (n: Num, v: number) => Math.abs(Math.round(v / n.ulp) * n.ulp - n.value) < n.ulp / 1e4;
const snip = (s: string) => (s.length > 110 ? s.slice(0, 107) + "..." : s);

type Found = { geoid: string; label: string } | { ambiguous: string };
function countiesIn(sentence: string, stateCtx: string | null): Found[] {
  const found: Found[] = [];
  let rest = sentence;
  for (const sn of shortNames) {
    const at = rest.indexOf(sn);
    if (at < 0 || /[A-Za-z]/.test(rest[at - 1] ?? " ") || /[A-Za-z]/.test(rest[at + sn.length] ?? " ")) continue;
    const after = rest.slice(at + sn.length);
    const explicit = [...stateByName].find(([n]) => after.startsWith(`, ${n}`))?.[1] ?? [...stateByAbbr].find(([a]) => after.startsWith(`, ${a}`))?.[1] ?? null;
    const cands = shortName.get(sn)!;
    const inBlocks = cands.filter((g) => blockGeoids.has(g));
    const pick = cands.length === 1 ? cands[0]
      : cands.find((g) => explicit && g.startsWith(explicit)) ?? (inBlocks.length === 1 ? inBlocks[0] : undefined) ?? (stateCtx ? cands.find((g) => g.startsWith(stateCtx)) : undefined);
    found.push(pick ? { geoid: pick, label: names[pick] } : { ambiguous: sn });
    rest = rest.slice(0, at) + " ".repeat(sn.length) + after; // longest name wins; don't match its parts again
  }
  return found;
}

type Cand = { label: string; refKey: string; v: number };
function check(n: Num, where: string, sentence: string, cands: Cand[]) {
  const tag = `${n.text}  [${where}] "${snip(sentence)}"`;
  const unitOk = cands.filter((c) => allRefs.get(c.refKey)!.unit === unitOf(n.unit));
  const hit = unitOk.find((c) => fits(n, c.v));
  if (hit) return void lines.match.push(`${n.text} = ${hit.refKey}, ${hit.label}: ${hit.v}`);
  const by = (a: Cand, b: Cand) => Math.abs(a.v - n.value) - Math.abs(b.v - n.value);
  const near = unitOk.filter((c) => Math.abs(c.v - n.value) <= n.ulp * 1.0001).sort(by)[0];
  if (near) return void lines.rounding.push(`${tag}\n      data: ${near.refKey}, ${near.label} = ${near.v}; to the written precision it should read ${(Math.round(near.v / n.ulp) * n.ulp).toFixed(Math.max(0, Math.round(-Math.log10(n.ulp))))}`);
  const close = unitOk.filter((c) => c.v !== 0 && Math.abs(c.v - n.value) / Math.abs(c.v) <= 0.2).sort(by)[0];
  if (close) return void lines.mismatch.push(`${tag}\n      closest data: ${close.refKey}, ${close.label} = ${close.v}`);
  lines.unverified.push(tag);
}

let stateCtx: string | null = null;
for (const p of paragraphs) {
  if (p.where === "heading") continue;
  stateCtx = null;
  for (const sentence of strip(p.text).split(/(?<=[a-z0-9%)"”.])[.!?]\s+(?=[A-Z"“])/)) {
    for (const [n, fp] of stateByName) if (sentence.includes(n)) stateCtx = fp; // last state named so far in this paragraph
    const nums = numbers(sentence);
    if (!nums.length) continue;
    const here = countiesIn(sentence, stateCtx);
    const resolved = here.filter((h): h is { geoid: string; label: string } => "geoid" in h);
    const cands = resolved.flatMap((c) => [...allRefs.keys()].map((k) => ({ label: c.label, refKey: k, v: values.get(k)?.[c.geoid] }))).filter((c): c is Cand => c.v != null);
    for (const n of nums) {
      if (n.unit === "ρ") {
        const hit = blocks.flatMap((b) => (b.kind === "correlations" ? b.rows.flatMap((r) => r.cells.map((c, i) => ({ c, r, w: b.with[i] }))) : [])).find((x) => x.c && x.c.rho.toFixed(2) === n.value.toFixed(2));
        if (hit) lines.match.push(`${n.text} = rank correlation of ${hit.r.ref.id} with ${hit.w.id} (table), rho ${hit.c!.rho.toFixed(4)}, n=${hit.c!.n}`);
        else lines.unverified.push(`${n.text}  [${p.where}] "${snip(sentence)}"`);
        continue;
      }
      if (resolved.length) { check(n, p.where, sentence, cands); continue; }
      // No county named: try a chart's group averages and edges, then the table blocks' own counties.
      const binHit = blocks.flatMap((b) => (b.kind === "bins" ? b.rows.flatMap((r, i) => [{ b, i, what: "average", v: r.value }, { b, i, what: "lower edge", v: r.lo }, { b, i, what: "upper edge", v: r.hi }]) : [])).find((x) => n.unit === "%" && n.ulp < 1 && fits(n, x.v));
      if (binHit) { lines.match.push(`${n.text} = chart "${binHit.b.title}", group ${binHit.i + 1} ${binHit.what} (${binHit.v.toFixed(2)}); place not named`); continue; }
      const viaBlock = [...blockGeoids].flatMap((g) => [...allRefs.keys()].map((k) => ({ label: names[g], refKey: k, v: values.get(k)?.[g] }))).filter((c): c is Cand => c.v != null && allRefs.get(c.refKey)!.unit === unitOf(n.unit) && fits(n, c.v));
      if (viaBlock.length === 1 && (n.unit === "$" || n.ulp < 1)) { lines.match.push(`${n.text} = ${viaBlock[0].refKey}, ${viaBlock[0].label}: ${viaBlock[0].v}; place not named, matched via a table block`); continue; }
      const amb = here.filter((h): h is { ambiguous: string } => "ambiguous" in h).map((h) => h.ambiguous);
      lines.unverified.push(`${n.text}  [${p.where}] "${snip(sentence)}"${viaBlock.length > 1 ? " (fits several table values)" : ""}${amb.length ? ` (county name ambiguous: ${amb.join(", ")})` : ""}`);
    }
  }
}

const show = (title: string, xs: string[]) => { console.log(`\n${title}: ${xs.length}`); for (const x of xs) console.log(`  - ${x}`); };
console.log(`Numbers check: ${slug}  (values from ${staticUrl("")})\nPiece: ${special.words} words, ${special.minutes} min read, ${blocks.length} inline blocks, ${allRefs.size} datasets used`);
show("Blocks", lines.notes);
show("MISMATCH (close to a real value but not equal: probably a typo; or a block's value differs from the data)", lines.mismatch);
show("ROUNDING PROBLEM (off by one in the last written digit)", lines.rounding);
show("MATCH", lines.match);
show("UNVERIFIED, check by hand (not tied to a dataset, place and level here)", lines.unverified);
console.log(`\nSummary: ${lines.match.length} match, ${lines.rounding.length} rounding, ${lines.mismatch.length} mismatch, ${lines.unverified.length} unverified.`);
if (lines.mismatch.length || lines.rounding.length) process.exit(1);
