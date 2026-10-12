// Weird Insights v0: county-level correlations across every pair of datasets.
//
// Every pair gets Pearson r and Spearman ρ, then the SPEC §10 spuriousness checks.
// Any flag keeps the pair out of the published set (status "flagged", reason kept).
// Published pairs get a headline + caption written once at build time (D-08) by
// Claude, or a plain template when no API key is available. Viewers never call the API.
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { db, log, ROOT, upsert } from "./util.ts";

const LEVEL = "county";
/** Thresholds for the §10 checks. */
export const RULES = {
  minN: 500,            // fewer joined counties than this → too small
  tooGoodR: 0.9,        // |r| or |ρ| above this between different datasets → suspicious
  pearsonSpearmanGap: 0.3, // large gap → driven by outliers or a nonlinear artifact
  minAbsRho: 0.3,       // weaker than this isn't worth publishing
  minWithinStateRho: 0.15, // after removing state means, a pattern weaker than this is only regional
};

interface Pair {
  x: DatasetEntry; y: DatasetEntry; n: number; r: number; rho: number; withinState: number; flags: string[];
}

/** Spearman ρ after removing each state's mean rank: does the pattern hold among counties in the same state? */
function withinStateRho(geoids: string[], a: number[], b: number[]) {
  const ra = ranks(a), rb = ranks(b);
  const demean = (r: number[]) => {
    const sums = new Map<string, [number, number]>();
    geoids.forEach((g, i) => { const s = sums.get(g.slice(0, 2)) ?? [0, 0]; s[0] += r[i]; s[1]++; sums.set(g.slice(0, 2), s); });
    return r.map((v, i) => { const [t, n] = sums.get(geoids[i].slice(0, 2))!; return v - t / n; });
  };
  return pearson(demean(ra), demean(rb));
}

function pearson(a: number[], b: number[]) {
  const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db; }
  return sab / Math.sqrt(saa * sbb);
}
function ranks(a: number[]) {
  const idx = a.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
  const r = new Array<number>(a.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}

function vars(e: DatasetEntry): string[] {
  const m = e.measure;
  if (m.kind === "acs5") return [...m.numerator, ...(m.denominator ?? [])];
  if (m.kind === "lodes") return [`LODES:${m.column}`];
  if (m.kind === "places") return [`PLACES:${m.measureId}`];
  if (m.kind === "climdiv") return [`CLIMDIV:${m.element}:${m.months.join(",")}`];
  if (m.kind === "nbi") return [`NBI:${m.condition}`];
  if (m.kind === "lead") return m.stat === "burden" ? ["LEAD:COST", "LEAD:INCOME"] : ["LEAD:COST"];
  if (m.kind === "features") return [`FEATURES:${e.id}`];
  if (m.kind === "hpms_vmt") return ["HPMS:VMT"];
  if (m.kind === "cejst") return ["CEJST:SN_C"];
  if (m.kind === "food_access") return [`FARA:${m.count}`, `FARA:${m.per}`];
  if (m.kind === "ddp_287g") return ["DDP:287G"];
  if (m.kind === "fema_nri") return [`NRI:${m.field}`];
  if (m.kind === "airquality") return [`AIRQUALITY:${m.sheet.includes("County Status Annual") ? "PM25" : "O3"}`];
  if (m.kind === "overdose") return ["VSRR:OVERDOSE"];
  return ["FARS:FATALS"];
}
function perArea(e: DatasetEntry) {
  return "perSqMi" in e.measure && e.measure.perSqMi;
}

function checks(x: DatasetEntry, y: DatasetEntry, n: number, r: number, rho: number, within: number): string[] {
  const f: string[] = [];
  if (Math.abs(rho) >= RULES.minAbsRho && (Math.abs(within) < RULES.minWithinStateRho || Math.sign(within) !== Math.sign(rho))) {
    f.push(`regional only: within states ρ=${within.toFixed(2)}`);
  }
  if (n < RULES.minN) f.push(`small sample (n=${n} < ${RULES.minN})`);
  if (Math.max(Math.abs(r), Math.abs(rho)) > RULES.tooGoodR) f.push(`too good to be true (|r|>${RULES.tooGoodR})`);
  if (Math.abs(r - rho) > RULES.pearsonSpearmanGap) f.push(`Pearson and Spearman disagree (r=${r.toFixed(2)}, ρ=${rho.toFixed(2)}): outlier-driven`);
  if (perArea(x) && perArea(y)) f.push("shared denominator: both divided by land area");
  const sharedVars = vars(x).filter((v) => vars(y).includes(v));
  if (sharedVars.length) f.push(`shared source variables (${sharedVars.join(", ")})`);
  if (x.universe === y.universe && x.measure.kind === "acs5" && y.measure.kind === "acs5" && x.measure.denominator && y.measure.denominator) {
    f.push(`shared denominator universe (${x.universe})`);
  }
  if (x.modelInputs.includes(y.id) || y.modelInputs.includes(x.id)) {
    f.push(`by construction: ${x.modelInputs.includes(y.id) ? x.title : y.title} is modeled using ${x.modelInputs.includes(y.id) ? y.title : x.title}`);
  }
  if (x.category === y.category) f.push(`same category (${x.category}): expected, not weird`);
  if (Math.abs(rho) < RULES.minAbsRho) f.push(`weak (|ρ|<${RULES.minAbsRho})`);
  return f;
}

const Caption = z.object({
  headline: z.string().describe("At most 12 words. States the pattern plainly; a light, dry touch is fine."),
  caption: z.string().describe("2–3 sentences, at most 60 words. What the pattern is, with the actual numbers, then one plausible confounder."),
});
type Caption = z.infer<typeof Caption>;

const SYSTEM = `You write captions for "Odd Pairings", a section of a public map site that pairs unrelated U.S. datasets and shows how they line up across counties.
Tone (Robbie, 2026-10-01, amending Q-4): plain language, no wordplay or flourish. The headline states the relationship in one sentence a general reader understands, e.g. "Counties with higher work-from-home rates tend to have lower physical inactivity rates." Never mock places, regions, groups of people, or anyone's health, income or circumstances.
Never imply causation: say "counties with more X tend to have more Y", not "X causes Y". If the within-state correlation is much weaker than the overall one, say plainly that much of the pattern is regional. Name one plausible confounder or shared driver in the caption. Use only the numbers you are given; don't invent statistics. American English, no emoji, no exclamation marks.`;

/** Lower-case a dataset title mid-sentence, keeping proper nouns (months) capitalized. */
const lc = (t: string) => (/^(January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(t) ? t : t[0].toLowerCase() + t.slice(1));

/** What the caption calls a dataset after "higher" / "lower": its registry phrase, else its title. */
const phrase = (e: DatasetEntry) => e.phrase ?? lc(e.title);
/** Plain-language strength for |ρ| (published pairs are all ≥ RULES.minAbsRho). */
// Judged on the printed (2-decimal) value, so "ρ = −0.60" never reads "moderate".
const strength = (rho: number) => { const a = Math.abs(+rho.toFixed(2)); return a >= 0.6 ? "strong" : a >= 0.4 ? "moderate" : "modest"; };
const num = (v: number) => v.toFixed(2).replace("-", "−");

// Plain statements, no flourish (Robbie, 2026-10-01): say what goes with what, how strongly, and
// whether it is mostly regional.
function template(p: Pair): Caption {
  const dir = p.rho > 0 ? "higher" : "lower";
  const regional = Math.abs(p.withinState) < Math.abs(p.rho) * 0.6;
  const within = regional
    ? `Much of it is regional: within the same state the link is weaker (ρ = ${num(p.withinState)}).`
    : `It holds within states too (ρ = ${num(p.withinState)}). Both may reflect something else, such as how urban a county is.`;
  const headline = `Counties with higher ${phrase(p.x)} tend to have ${dir} ${phrase(p.y)}`;
  return {
    headline,
    caption: `A ${strength(p.rho)} link across ${p.n.toLocaleString()} counties (Spearman ρ = ${num(p.rho)}). ${within}`,
  };
}

async function writeCaption(client: Anthropic | null, p: Pair): Promise<{ c: Caption; by: string }> {
  if (!client) return { c: template(p), by: "template" };
  const prompt = `Dataset X: ${p.x.title} — ${p.x.description} (unit: ${p.x.unit}; ${p.x.vintage})
Dataset Y: ${p.y.title} — ${p.y.description} (unit: ${p.y.unit}; ${p.y.vintage})
Counties compared: ${p.n}
Spearman rank correlation ρ = ${p.rho.toFixed(2)}; Pearson r = ${p.r.toFixed(2)}
Within-state ρ (after removing each state's average) = ${p.withinState.toFixed(2)}; if this is much weaker than ρ, part of the pattern is regional, so say so.
Write the headline and caption.`;
  try {
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: z.toJSONSchema(Caption) } },
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    } as never) as unknown as Anthropic.Beta.BetaMessage;
    if (res.stop_reason === "refusal") return { c: template(p), by: "template (model declined)" };
    const text = res.content.find((b) => b.type === "text");
    const parsed = Caption.safeParse(JSON.parse(text && "text" in text ? text.text : "{}"));
    return parsed.success ? { c: parsed.data, by: res.model } : { c: template(p), by: "template (unparseable reply)" };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw e;
    log("insights", `caption failed for ${p.x.id}×${p.y.id}: ${(e as Error).message}; using template`);
    return { c: template(p), by: "template (API error)" };
  }
}

export async function computeInsights() {
  const entries = loadRegistry();
  const pool = db();
  const { rows } = await pool.query<{ dataset_id: string; geoid: string; value: number }>(
    "select dataset_id, geoid, value from public.dataset_values where level = $1 and value is not null", [LEVEL]);
  const byDs = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!byDs.has(r.dataset_id)) byDs.set(r.dataset_id, new Map());
    byDs.get(r.dataset_id)!.set(r.geoid, r.value);
  }
  // Sensitive datasets (e.g. immigration enforcement) never enter playful pairings.
  const loaded = entries.filter((e) => byDs.has(e.id) && !e.excludeFromInsights);
  const pairs: Pair[] = [];
  for (let i = 0; i < loaded.length; i++) for (let j = i + 1; j < loaded.length; j++) {
    const x = loaded[i], y = loaded[j];
    const gs: string[] = [], xs: number[] = [], ys: number[] = [];
    for (const [g, v] of byDs.get(x.id)!) { const w = byDs.get(y.id)!.get(g); if (w != null) { gs.push(g); xs.push(v); ys.push(w); } }
    if (xs.length < 3) continue;
    const r = pearson(xs, ys), rho = pearson(ranks(xs), ranks(ys)), within = withinStateRho(gs, xs, ys);
    pairs.push({ x, y, n: xs.length, r, rho, withinState: within, flags: checks(x, y, xs.length, r, rho, within) });
  }
  pairs.sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const client = apiKey ? new Anthropic({ apiKey }) : null;
  if (!client) log("insights", "ANTHROPIC_API_KEY not set: published insights get template captions");

  const out: unknown[][] = [];
  const exported = [];
  for (const p of pairs) {
    const id = `${p.x.id}__${p.y.id}`;
    const published = p.flags.length === 0;
    const cap = published ? await writeCaption(client, p) : null;
    out.push([id, p.x.id, p.y.id, LEVEL, p.n, p.r, p.rho, published ? "published" : "flagged", p.flags, cap?.c.headline ?? null, cap?.c.caption ?? null]);
    const card = { id, x: p.x.id, y: p.y.id, level: LEVEL, n: p.n, r: +p.r.toFixed(3), rho: +p.rho.toFixed(3), withinState: +p.withinState.toFixed(3),
      status: published ? "published" : "flagged", flags: p.flags, headline: cap?.c.headline ?? null, caption: cap?.c.caption ?? null, captionBy: cap?.by ?? null };
    // What a reviewer approves (D-116): if the numbers or wording change, the card needs review again.
    const fingerprint = createHash("sha256").update(JSON.stringify([card.x, card.y, card.n, card.r, card.rho, card.withinState, card.headline, card.caption])).digest("hex").slice(0, 16);
    exported.push({ ...card, fingerprint });
  }
  await pool.query("delete from public.insights where level = $1", [LEVEL]);
  await upsert(pool, "public.insights", ["id", "x_dataset", "y_dataset", "level", "n", "pearson_r", "spearman_rho", "status", "flags", "headline", "caption"], ["id"], out);
  await pool.end();

  const dir = join(ROOT, "apps/web/src/generated");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "insights.json"), JSON.stringify({ rules: RULES, generatedAt: new Date().toISOString(), insights: exported }, null, 1));
  const pub = exported.filter((e) => e.status === "published").length;
  log("insights", `${pairs.length} pairs: ${pub} published, ${pairs.length - pub} flagged`);
  for (const e of exported) log("insights", `${e.status === "published" ? "✓" : "✗"} ${e.x} × ${e.y}  ρ=${e.rho} r=${e.r} within=${e.withinState} n=${e.n}${e.flags.length ? `  [${e.flags.join("; ")}]` : ""}`);
}
