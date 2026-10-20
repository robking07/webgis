// Combinations (#280): one focus dataset plus 2–4 companions that, together, line up with it across
// counties much more closely than any one of them alone. Method: drafts/proposals/combinations-method.md
// with the lead + ponytail amendments recorded in docs/decisions/D-381-combinations-method.md.
//
// Search on half the states, confirm on the other half, both ways round. A set survives when it is
// found in both directions and, on the half it never saw, beats its best member by the gain threshold,
// every member keeps its sign and earns its place, it passes a partial-F test on a Clifford effective n
// after Benjamini–Yekutieli across every set tested, and the full-data weights still add something in
// at least 3 of the 4 Census regions. Writes apps/web/src/generated/combinations.json; insights.json
// and its pair fingerprints are untouched.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { pearson, phrase, ranks, withinStateRho } from "./insights.ts";
import { readGazetteer } from "./geographies.ts";
import { log, ROOT, TILES } from "./util.ts";

export const COMBO_RULES = {
  gain: 0.02,          // ΔR² over the best single member (also the step needed to add a companion)
  maxCompanions: 4,    // sets of 3 to 5 datasets
  candidates: 30,      // companions tried per focus: top passing pairs by |within-state ρ|
  maxInterRho: 0.7,    // |ρ| between two companions
  maxPerCategory: 2,   // companions from one category
  maxPlaces: 1,        // CDC PLACES modelled estimates among the companions
  maxComposites: 1,    // composite indexes (SVI, FEMA NRI scores, CEJST) in the whole set
  minN: 1000,          // complete counties for the set
  minRegions: 3,       // of the 4 Census regions where the full-data weights still add something
  fdrQ: 0.05,          // Benjamini–Yekutieli across every set that reached confirmation
  merge: 0.6,          // two sets sharing this share of members (of the larger) are one combination
  urbanRuralGain: 0.01, // gain left after adding population density below this → flagged urban–rural
  distanceClasses: 200, // equal-count distance classes for the effective-n correlograms (≤ 255: Uint8Array)
  muchCloser: 0.1,     // held-out gain from which the caption says "much more closely"
};
type Rules = typeof COMBO_RULES;

/** Census divisions (state FIPS), in region order: Northeast, Midwest, South, West. */
const DIVISIONS = [
  ["09", "23", "25", "33", "44", "50"], ["34", "36", "42"],
  ["17", "18", "26", "39", "55"], ["19", "20", "27", "29", "31", "38", "46"],
  ["10", "11", "12", "13", "24", "37", "45", "51", "54"], ["01", "21", "28", "47"], ["05", "22", "40", "48"],
  ["04", "08", "16", "30", "32", "35", "49", "56"], ["02", "06", "15", "41", "53"],
];
const REGION_OF_DIVISION = [0, 0, 1, 1, 2, 2, 2, 3, 3];
const URBAN = "population_density";

/** Who reviews before publishing (#280, D-373): race/ethnicity, immigration, disability or minority status. */
const SENSITIVE_SUBCATEGORIES = ["Race and ethnicity", "Immigration and language", "Disability"];
/** Direct members only (lead, 2026-10-20): `modelInputs` are not followed. */
export const sensitive = (e: DatasetEntry) => SENSITIVE_SUBCATEGORIES.includes(e.subcategory) || /disabilit|minority/i.test(e.title);

/** Composite indexes built from other datasets: at most one per combination. */
const COMPOSITES = new Set(["nri_risk_score", "nri_social_vulnerability", "nri_community_resilience", "nri_expected_loss_per_person"]);
const composite = (e: DatasetEntry) => e.measure.kind === "svi" || e.measure.kind === "cejst" || COMPOSITES.has(e.id);

/** Every dataset `id` is built from, following `modelInputs` transitively (the seen set stops cycles). */
export function ingredients(id: string, byId: Map<string, DatasetEntry>, seen = new Set<string>()): Set<string> {
  for (const m of byId.get(id)?.modelInputs ?? []) if (!seen.has(m)) { seen.add(m); ingredients(m, byId, seen); }
  return seen;
}

/** County values (NaN = missing) with centroids; PR and counties without a 2024 centroid are left out. */
export interface Data { geoids: string[]; lat: number[]; lon: number[]; values: Map<string, Float64Array> }
/** Today's pair screen (insights.json): Spearman ρ, within-state ρ and flags, keyed "a__b" sorted. */
export type Pairs = Map<string, { rho: number; withinState: number; flags: string[] }>;
const key = (a: string, b: string) => (a < b ? `${a}__${b}` : `${b}__${a}`);

// ---- maths -----------------------------------------------------------------------------------

/** Solve A x = b (small, symmetric) by Gaussian elimination with partial pivoting. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array<number>(n);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
  return x;
}
/** R² and standardized weights of y on predictors, from correlations only: R² = r′R⁻¹r. */
export function r2(R: number[][], r: number[]) {
  const beta = solve(R, r);
  return { r2: beta.reduce((s, b, i) => s + b * r[i], 0), beta };
}
const sub = (R: number[][], keep: number[]) => keep.map((i) => keep.map((j) => R[i][j]));

function lgamma(x: number) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, s = 1.000000000190015; const t = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  for (const v of c) s += v / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function betacf(a: number, b: number, x: number) {
  const tiny = 1e-30, fix = (v: number) => (Math.abs(v) < tiny ? tiny : v);
  let c = 1, d = 1 / fix(1 - (a + b) * x / (a + 1)), h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a - 1 + m2) * (a + m2));
    d = 1 / fix(1 + aa * d); c = fix(1 + aa / c); h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + 1 + m2));
    d = 1 / fix(1 + aa * d); c = fix(1 + aa / c); const del = d * c; h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}
/** Regularized incomplete beta I_x(a, b) (Numerical Recipes). */
function betai(a: number, b: number, x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
/** Upper-tail p-value of F(d1, d2). */
export const fP = (F: number, d1: number, d2: number) => betai(d2 / 2, d1 / 2, d2 / (d2 + d1 * F));

/** Benjamini–Yekutieli: which p-values are discoveries at FDR q under arbitrary dependence. */
export function by(ps: number[], q: number): boolean[] {
  const m = ps.length; let c = 0; for (let j = 1; j <= m; j++) c += 1 / j;
  const order = ps.map((_, i) => i).sort((a, b) => ps[a] - ps[b]);
  let k = -1; order.forEach((i, r) => { if (ps[i] <= (r + 1) * q / (m * c)) k = r; });
  const pass = new Set(order.slice(0, k + 1));
  return ps.map((_, i) => pass.has(i));
}

/** Distance class (0..K-1, equal counts) for every county pair i<j, as cls[i*N+j]. */
export function distanceClasses(lat: number[], lon: number[], K: number): Uint8Array {
  const N = lat.length, rad = Math.PI / 180, d = new Float32Array(N * (N - 1) / 2);
  const hav = (i: number, j: number) => {
    const a = Math.sin((lat[j] - lat[i]) * rad / 2) ** 2 + Math.cos(lat[i] * rad) * Math.cos(lat[j] * rad) * Math.sin((lon[j] - lon[i]) * rad / 2) ** 2;
    return 2 * Math.asin(Math.sqrt(a));
  };
  let p = 0; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) d[p++] = hav(i, j);
  const sorted = d.slice().sort(), cuts = Array.from({ length: K - 1 }, (_, k) => sorted[Math.floor((k + 1) * sorted.length / K)]);
  const cls = new Uint8Array(N * N);
  p = 0; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const v = d[p++]; let lo = 0, hi = K - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (v >= cuts[mid]) lo = mid + 1; else hi = mid; } cls[i * N + j] = lo; }
  return cls;
}
/** Clifford–Richardson–Hémon (1989) effective n for the correlation of x and y over counties idx. */
export function nEff(x: number[], y: number[], idx: number[], cls: Uint8Array, N: number, K: number) {
  const m = idx.length, mx = x.reduce((s, v) => s + v, 0) / m, my = y.reduce((s, v) => s + v, 0) / m;
  const dx = x.map((v) => v - mx), dy = y.map((v) => v - my);
  const vx = dx.reduce((s, v) => s + v * v, 0) / m, vy = dy.reduce((s, v) => s + v * v, 0) / m;
  const sx = new Float64Array(K), sy = new Float64Array(K), cnt = new Float64Array(K);
  for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) {
    const i = idx[a], j = idx[b], k = i < j ? cls[i * N + j] : cls[j * N + i];
    sx[k] += dx[a] * dx[b]; sy[k] += dy[a] * dy[b]; cnt[k]++;
  }
  let S = m; // Σ_ij ρx(d_ij) ρy(d_ij), diagonal included
  for (let k = 0; k < K; k++) if (cnt[k]) S += 2 * cnt[k] * (sx[k] / cnt[k] / vx) * (sy[k] / cnt[k] / vy);
  return Math.min(m, Math.max(1, 1 + m * m / S));
}

// ---- method ----------------------------------------------------------------------------------

interface Ctx { d: Data; byId: Map<string, DatasetEntry>; pairs: Pairs; half: Uint8Array; region: Int8Array; cls: Uint8Array; rules: Rules; wcache: Map<string, number>; ing: Map<string, Set<string>> }

export function context(d: Data, entries: DatasetEntry[], pairs: Pairs, rules: Rules = COMBO_RULES): Ctx {
  // Halves: alternate states within each division, so both halves cover every region.
  const halfOf = new Map<string, number>(), regionOf = new Map<string, number>();
  DIVISIONS.forEach((states, dv) => states.forEach((s, i) => { halfOf.set(s, i % 2); regionOf.set(s, REGION_OF_DIVISION[dv]); }));
  const st = d.geoids.map((g) => g.slice(0, 2)), byId = new Map(entries.map((e) => [e.id, e]));
  if (st.some((s) => !halfOf.has(s))) throw new Error("combinations: county outside the 50 states + DC");
  return {
    d, byId, pairs, rules, wcache: new Map(), ing: new Map(entries.map((e) => [e.id, ingredients(e.id, byId)])),
    half: Uint8Array.from(st, (s) => halfOf.get(s)!), region: Int8Array.from(st, (s) => regionOf.get(s)!),
    cls: distanceClasses(d.lat, d.lon, rules.distanceClasses),
  };
}

/** Counties (in half h, or all when h < 0) where every member has a value. */
function complete(c: Ctx, ids: string[], h = -1) {
  const vs = ids.map((id) => c.d.values.get(id)!), idx: number[] = [];
  for (let i = 0; i < c.d.geoids.length; i++) if ((h < 0 || c.half[i] === h) && vs.every((v) => !Number.isNaN(v[i]))) idx.push(i);
  return idx;
}
/** Within-state rank correlation on half h, pairwise complete (search only), cached. */
function wrho(c: Ctx, h: number, a: string, b: string) {
  const k = `${h}:${key(a, b)}`;
  let v = c.wcache.get(k);
  if (v === undefined) {
    const idx = complete(c, [a, b], h), va = c.d.values.get(a)!, vb = c.d.values.get(b)!;
    v = withinStateRho(idx.map((i) => c.d.geoids[i]), idx.map((i) => va[i]), idx.map((i) => vb[i]));
    c.wcache.set(k, v);
  }
  return v;
}
function fitPairwise(c: Ctx, h: number, f: string, comps: string[]) {
  return r2(comps.map((a) => comps.map((b) => (a === b ? 1 : wrho(c, h, a, b)))), comps.map((a) => wrho(c, h, f, a)));
}

/** Companion guardrails against the set so far (the focus pairs were already screened). */
function allowed(c: Ctx, f: string, set: string[], x: string) {
  const ex = c.byId.get(x)!, members = [...set, x].map((id) => c.byId.get(id)!);
  if (members.filter((e) => e.category === ex.category).length > c.rules.maxPerCategory) return false;
  if (members.filter((e) => e.measure.kind === "places").length > c.rules.maxPlaces) return false;
  if ([f, ...set, x].filter((id) => composite(c.byId.get(id)!)).length > c.rules.maxComposites) return false;
  // Ingredient leak: x may not be built from the focus or a member, nor they from x (transitively).
  if ([f, ...set].some((id) => c.ing.get(x)?.has(id) || c.ing.get(id)?.has(x))) return false;
  for (const s of set) {
    const p = c.pairs.get(key(s, x));
    if (!p || Math.abs(p.rho) > c.rules.maxInterRho) return false;
    // Every pair rule except "weak" and "same category" (capped above instead).
    if (p.flags.some((fl) => !fl.startsWith("weak") && !fl.startsWith("same category"))) return false;
  }
  return complete(c, [f, ...set, x]).length >= c.rules.minN;
}

/** Greedy forward selection on half h: the nested companion lists with 2..4 members. */
export function discover(c: Ctx, f: string, h: number, gain = c.rules.gain): string[][] {
  // shortcut: the pair screen that admits candidates (insights.json) was computed on all counties;
  // only the ranking and fitting here use half h alone. Re-screen per half if leakage shows up.
  const cands = [...c.pairs].filter(([k, p]) => p.flags.length === 0 && k.split("__").includes(f))
    .map(([k]) => k.split("__").find((id) => id !== f)!)
    .sort((a, b) => Math.abs(wrho(c, h, f, b)) - Math.abs(wrho(c, h, f, a))).slice(0, c.rules.candidates);
  const set: string[] = [], out: string[][] = [];
  let cur = 0;
  while (set.length < c.rules.maxCompanions) {
    let best = "", bestR2 = cur;
    for (const x of cands) {
      if (set.includes(x) || !allowed(c, f, set, x)) continue;
      const v = fitPairwise(c, h, f, [...set, x]).r2;
      if (v > bestR2 && v < 1) { bestR2 = v; best = x; }
    }
    if (!best || (set.length && bestR2 - cur < gain)) break;
    set.push(best); cur = bestR2;
    if (set.length >= 2) out.push([...set]);
  }
  return out;
}

/** Exact fit on counties idx: rank, remove state means, correlate. */
function fit(c: Ctx, idx: number[], ids: string[]) {
  const geo = idx.map((i) => c.d.geoids[i]);
  const cols = ids.map((id) => {
    const v = c.d.values.get(id)!, r = ranks(idx.map((i) => v[i]));
    const sums = new Map<string, [number, number]>();
    geo.forEach((g, i) => { const s = sums.get(g.slice(0, 2)) ?? [0, 0]; s[0] += r[i]; s[1]++; sums.set(g.slice(0, 2), s); });
    const w = r.map((x, i) => { const [t, n] = sums.get(geo[i].slice(0, 2))!; return x - t / n; });
    const sd = Math.sqrt(w.reduce((s, x) => s + x * x, 0) / w.length) || 1;
    return w.map((x) => x / sd);
  });
  const m = idx.length, cor = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0) / m;
  const R = cols.map((a) => cols.map((b) => cor(a, b)));
  return { cols, R };
}

/** The confirmation tests on half h (or all counties for h < 0). Member 0 is the focus. */
export function confirm(c: Ctx, f: string, comps: string[], h: number, signs?: number[], gain = c.rules.gain) {
  const idx = complete(c, [f, ...comps], h), { cols, R } = fit(c, idx, [f, ...comps]);
  const k = comps.length, xs = comps.map((_, i) => i + 1), Rx = sub(R, xs), rx = xs.map((i) => R[0][i]);
  const full = r2(Rx, rx), best = Math.max(...rx.map((v) => v * v));
  const earns = xs.every((_, j) => full.r2 - r2(sub(Rx, xs.map((_, i) => i).filter((i) => i !== j)), rx.filter((_, i) => i !== j)).r2 >= gain / 2);
  const keepsSign = !signs || full.beta.every((b, j) => Math.sign(b) === signs[j]);
  const score = idx.map((_, i) => full.beta.reduce((s, b, j) => s + b * cols[j + 1][i], 0));
  const ne = nEff(cols[0], score, idx, c.cls, c.d.geoids.length, c.rules.distanceClasses);
  const F = ((full.r2 - best) / (k - 1)) / ((1 - full.r2) / (ne - k - 1));
  const p = ne > k + 1 && F > 0 ? fP(F, k - 1, ne - k - 1) : 1;
  return { idx, cols, n: idx.length, r2Set: full.r2, r2Best: best, gain: full.r2 - best, beta: full.beta, nEff: ne, p,
    ok: full.r2 - best >= gain && earns && keepsSign };
}

/** Census regions where the fitted weights still beat the best member alone, within the counties fitted. */
function regions(c: Ctx, all: ReturnType<typeof confirm>) {
  const score = all.idx.map((_, i) => all.beta.reduce((s, b, j) => s + b * all.cols[j + 1][i], 0));
  let passed = 0;
  for (let g = 0; g < 4; g++) {
    const at = all.idx.map((ci, i) => (c.region[ci] === g ? i : -1)).filter((i) => i >= 0), pick = (v: number[]) => at.map((i) => v[i]);
    if (at.length < 30) continue;
    const y = pick(all.cols[0]), bestOne = Math.max(...all.cols.slice(1).map((x) => pearson(pick(x), y) ** 2));
    if (pearson(pick(score), y) ** 2 - bestOne > 0) passed++;
  }
  return passed;
}

/** Gain left once population density is in the baseline; the focus being density counts as flagged. */
function urbanRural(c: Ctx, f: string, comps: string[]) {
  if (f === URBAN || !c.d.values.has(URBAN)) return f === URBAN;
  const ids = [f, ...new Set([...comps, URBAN])], idx = complete(c, ids), { R } = fit(c, idx, ids);
  const xs = ids.slice(1).map((_, i) => i + 1), u = ids.indexOf(URBAN);
  const withAll = r2(sub(R, xs), xs.map((i) => R[0][i])).r2;
  const bestPlusU = Math.max(...xs.filter((i) => i !== u).map((i) => r2(sub(R, [i, u]), [R[0][i], R[0][u]]).r2));
  return withAll - bestPlusU < c.rules.urbanRuralGain;
}

function caption(c: Ctx, f: string, comps: string[], beta: number[], gain: number) {
  const flip = beta.filter((b) => b < 0).length > beta.filter((b) => b > 0).length;
  const dir = (b: number) => ((b > 0) !== flip ? "higher" : "lower");
  const ph = (id: string) => phrase(c.byId.get(id)!);
  const parts = comps.map((id, j) => `${dir(beta[j])} ${ph(id)}`);
  const list = `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`, y = ph(f);
  return `Counties with ${list} tend to have ${flip ? "lower" : "higher"} ${y.replace(/\.$/, "")}. Together they line up with ${y} ${gain >= c.rules.muchCloser ? "much more" : "more"} closely than any one alone.`;
}

/** The whole method at one gain threshold. */
export function combinations(c: Ctx, gain = c.rules.gain) {
  const focuses = [...c.d.values.keys()].filter((f) => [...c.pairs].filter(([k, p]) => !p.flags.length && k.split("__").includes(f)).length >= 3);
  // True holdout: a set discovered on one half is confirmed only on the other (gain, signs, p, regions).
  // Being found from both halves ("stable") ranks a set higher but doesn't gate it.
  // shortcut: stands in for the proposal's 100 state bootstraps and a spatial-permutation (Moran
  // spectral) null; upgrade if the dry-run yield looks too loose or too strict.
  const tested: { f: string; comps: string[]; heldOut: number; stable: boolean; conf: ReturnType<typeof confirm> }[] = [];
  for (const f of focuses) {
    const found = [discover(c, f, 0, gain), discover(c, f, 1, gain)];
    found.forEach((sets, h) => { for (const comps of sets) {
      const stable = found[1 - h].some((s) => s.length === comps.length && s.every((x) => comps.includes(x)));
      tested.push({ f, comps, heldOut: 1 - h, stable, conf: confirm(c, f, comps, 1 - h, fitPairwise(c, h, f, comps).beta.map(Math.sign), gain) });
    } });
  }
  const fdr = by(tested.map((t) => t.conf.p), c.rules.fdrQ);
  const passing = tested.flatMap((t, i) => {
    if (!t.conf.ok || !fdr[i]) return [];
    const reg = regions(c, t.conf);
    return reg >= c.rules.minRegions ? [{ ...t, regions: reg, score: t.conf.gain + (t.stable ? 1 : 0) }] : [];
  });
  // One per focus (the largest that passed; stable, then gain, breaks ties), then merge the union's sets sharing ≥ 60% of members.
  const perFocus = new Map<string, (typeof passing)[number]>();
  for (const p of passing) { const q = perFocus.get(p.f); if (!q || p.comps.length > q.comps.length || (p.comps.length === q.comps.length && p.score > q.score)) perFocus.set(p.f, p); }
  const kept: (typeof passing)[number][] = [];
  for (const p of [...perFocus.values()].sort((a, b) => b.score - a.score)) {
    const m = [p.f, ...p.comps];
    if (!kept.some((k) => { const n = [k.f, ...k.comps]; return m.filter((x) => n.includes(x)).length / Math.max(m.length, n.length) >= c.rules.merge; })) kept.push(p);
  }
  const out = kept.map((p) => {
    const members = [p.f, ...p.comps], r3 = (v: number) => +v.toFixed(3), all = confirm(c, p.f, p.comps, -1, undefined, gain);
    const card = {
      // n, R² and weights: all counties (for display); gain, nEff, p and regions: the held-out half only.
      id: members.join("__"), focus: p.f, companions: p.comps, size: members.length, n: all.n,
      r2Best: r3(all.r2Best), r2Set: r3(all.r2Set), weights: all.beta.map(r3),
      heldOut: p.heldOut ? "B" : "A", gain: r3(p.conf.gain), nEff: Math.round(p.conf.nEff), p: p.conf.p, regions: p.regions, stable: p.stable,
      urbanRural: urbanRural(c, p.f, p.comps), sensitive: members.some((id) => sensitive(c.byId.get(id)!)),
      caption: caption(c, p.f, p.comps, all.beta, p.conf.gain),
    };
    // What a reviewer approves (D-116): if the members, numbers or wording change, it needs review again.
    const fingerprint = createHash("sha256").update(JSON.stringify([members, card.n, card.r2Best, card.r2Set, card.gain, card.weights, card.caption])).digest("hex").slice(0, 16);
    return { ...card, fingerprint };
  });
  return { tested: tested.length, passing: passing.length, combinations: out };
}

// ---- ingest step -----------------------------------------------------------------------------

// shortcut: reads the published county value files (the numbers the map shows), not the database
// that insights.ts queries, so it runs without keys; switch to dataset_values if the two ever differ.
async function countyValues(id: string): Promise<Record<string, number>> {
  const local = join(TILES, "values", id, "county.json");
  if (existsSync(local)) return JSON.parse(readFileSync(local, "utf8"));
  // 133 parallel requests occasionally time out on connect: retry twice before giving up.
  const get = () => fetch(`https://tiles.mapwich.org/values/${id}/county.json`);
  const res = await get().catch(get).catch(get);
  if (!res.ok) throw new Error(`combinations: ${id} county values: HTTP ${res.status}`);
  return res.json() as Promise<Record<string, number>>;
}

export async function computeCombinations(dryRun = false) {
  const t0 = Date.now(), entries = loadRegistry();
  const ins = JSON.parse(readFileSync(join(ROOT, "apps/web/src/generated/insights.json"), "utf8")) as { insights: { x: string; y: string; rho: number; withinState: number; flags: string[] }[] };
  const pairs: Pairs = new Map(ins.insights.map((p) => [key(p.x, p.y), p]));
  const ids = [...new Set(ins.insights.flatMap((p) => [p.x, p.y]))];
  // shortcut: Puerto Rico has no Census region and counties missing from the 2024 Gazetteer (old
  // Connecticut counties) have no centroid, so both sit out; fine while every set needs 1,000 counties.
  const gaz = new Map((await readGazetteer("2024_Gaz_counties_national")).map((r) => [r.GEOID, [+r.INTPTLAT, +r.INTPTLONG]]));
  const raw = await Promise.all(ids.map(countyValues));
  const geoids = [...new Set(raw.flatMap(Object.keys))].filter((g) => gaz.has(g) && !g.startsWith("72")).sort();
  const d: Data = { geoids, lat: geoids.map((g) => gaz.get(g)![0]), lon: geoids.map((g) => gaz.get(g)![1]),
    values: new Map(ids.map((id, i) => [id, Float64Array.from(geoids, (g) => raw[i][g] ?? NaN)])) };
  const c = context(d, entries, pairs);
  log("combinations", `${ids.length} datasets, ${geoids.length} counties, ${pairs.size} pairs; loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const run = (gain: number) => {
    const t = Date.now(), r = combinations(c, gain), cs = r.combinations, size = (s: number) => cs.filter((x) => x.size === s).length;
    log("combinations", `gain ≥ ${gain}: ${r.tested} tested, ${r.passing} passed, ${cs.length} after dedupe (3: ${size(3)}, 4: ${size(4)}, 5: ${size(5)}); urban–rural ${cs.filter((x) => x.urbanRural).length}, sensitive ${cs.filter((x) => x.sensitive).length}, stable ${cs.filter((x) => x.stable).length}; nEff ${Math.min(...cs.map((x) => x.nEff))}–${Math.max(...cs.map((x) => x.nEff))}; ${((Date.now() - t) / 1000).toFixed(1)}s`);
    return r;
  };
  if (dryRun) { run(0.01); run(0.03); }
  const r = run(COMBO_RULES.gain);
  for (const x of r.combinations.slice(0, dryRun ? 10 : Infinity)) {
    log("combinations", `${x.id}  R² ${x.r2Best}→${x.r2Set} held-out ${x.heldOut} gain ${x.gain}${x.stable ? " stable" : ""} nEff ${x.nEff} p ${x.p.toExponential(1)} regions ${x.regions}${x.urbanRural ? " [urban–rural]" : ""}${x.sensitive ? " [sensitive]" : ""}\n    ${x.caption}`);
  }
  log("combinations", `total ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (dryRun) return;
  const dir = join(ROOT, "apps/web/src/generated");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "combinations.json"), JSON.stringify({ rules: COMBO_RULES, generatedAt: new Date().toISOString(), combinations: r.combinations }, null, 1));
}
