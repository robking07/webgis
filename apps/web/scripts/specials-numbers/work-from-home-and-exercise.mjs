// Every number in content/specials/work-from-home-and-exercise.md, computed from Mapwich's own
// exported county values (public/data/values). Not part of the app or the build; run by hand:
//   node apps/web/scripts/specials-numbers/work-from-home-and-exercise.mjs
// Spearman ρ uses average ranks for ties and "within state" removes each state's mean rank,
// the same method as the Odd Pairings (data/ingest/src/insights.ts).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "../../public/data");
const V = (id, stop) => JSON.parse(readFileSync(join(DATA, "values", id, ...(stop ? [stop] : []), "county.json"), "utf8"));
const NAMES = JSON.parse(readFileSync(join(DATA, "geo/names.json"), "utf8"));

const pearson = (a, b) => {
  const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db; }
  return sab / Math.sqrt(saa * sbb);
};
const ranks = (a) => {
  const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
  const r = new Array(a.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; }
  return r;
};
const shared = (x, y, keep = () => true) => Object.keys(x).filter((g) => g in y && keep(g));
const rho = (x, y, keep) => { const g = shared(x, y, keep); return { rho: pearson(ranks(g.map((k) => x[k])), ranks(g.map((k) => y[k]))), n: g.length }; };
const withinState = (x, y) => {
  const g = shared(x, y), rx = ranks(g.map((k) => x[k])), ry = ranks(g.map((k) => y[k]));
  const demean = (r) => { const m = new Map(); g.forEach((k, i) => { const s = m.get(k.slice(0, 2)) ?? [0, 0]; s[0] += r[i]; s[1]++; m.set(k.slice(0, 2), s); }); return r.map((v, i) => { const [t, n] = m.get(g[i].slice(0, 2)); return v - t / n; }); };
  return pearson(demean(rx), demean(ry));
};
const median = (v) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const f2 = (v) => v.toFixed(2), f1 = (v) => v.toFixed(1);
/** Residuals of y after least squares on the columns of X (with an intercept). */
function residuals(y, X) {
  const k = X.length + 1, A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0);
  const row = (i) => [1, ...X.map((c) => c[i])];
  for (let i = 0; i < y.length; i++) { const r = row(i); for (let a = 0; a < k; a++) { b[a] += r[a] * y[i]; for (let c = 0; c < k; c++) A[a][c] += r[a] * r[c]; } }
  for (let i = 0; i < k; i++) { let p = i; for (let j = i + 1; j < k; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j; [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]]; for (let j = i + 1; j < k; j++) { const f = A[j][i] / A[i][i]; for (let c = i; c < k; c++) A[j][c] -= f * A[i][c]; b[j] -= f * b[i]; } }
  const x = new Array(k); for (let i = k - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < k; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
  return y.map((v, i) => v - row(i).reduce((s, r, a) => s + r * x[a], 0));
}

const wfh = V("pct_work_from_home"), pi = V("physical_inactivity");
const out = (label, value) => console.log(`${label.padEnd(64)} ${value}`);

console.log("── The headline pattern");
const all = rho(wfh, pi);
out("counties with both values (n)", all.n);
out("Spearman ρ, work from home vs. no leisure-time exercise", f2(all.rho));
out("within-state ρ", f2(withinState(wfh, pi)));
const g = shared(wfh, pi);
const missing = {};
for (const k of Object.keys(wfh)) if (!(k in pi)) missing[NAMES[k.slice(0, 2)]] = (missing[NAMES[k.slice(0, 2)]] ?? 0) + 1;
out("counties with work from home but no inactivity value, by state", Object.entries(missing).map(([s, n]) => `${s} ${n}`).join("; "));
out("median county: work from home (%)", f1(median(g.map((k) => wfh[k]))));
out("median county: no leisure-time exercise (%)", f1(median(g.map((k) => pi[k]))));
out("range of no leisure-time exercise (min–max %)", `${Math.min(...g.map((k) => pi[k]))}–${Math.max(...g.map((k) => pi[k]))}`);

console.log("\n── Chart: average inactivity by tenth of counties (sorted by work from home, ties by FIPS)");
const s = [...g].sort((a, b) => wfh[a] - wfh[b] || a.localeCompare(b));
for (let d = 0; d < 10; d++) {
  const part = s.slice(Math.floor((d * s.length) / 10), Math.floor(((d + 1) * s.length) / 10));
  out(`tenth ${d + 1}: ${part.length} counties, WFH ${f1(wfh[part[0]])}–${f1(wfh[part.at(-1)])}%`, `${f1(part.reduce((t, k) => t + pi[k], 0) / part.length)}% inactive`);
}

console.log("\n── Before the pandemic (timeline stops of the same ACS table)");
for (const [stop, label] of [["2019", "2015–2019"], ["2014", "2010–2014"]]) {
  const w = V("pct_work_from_home", stop), r = rho(w, pi);
  out(`${label}: ρ with 2023 inactivity (n)`, `${f2(r.rho)} (${r.n})`);
  out(`${label}: median county work from home (%)`, f1(median(shared(w, pi).map((k) => w[k]))));
}

console.log("\n── Table: what else lines up (Spearman ρ across counties)");
const others = ["per_capita_income", "median_household_income", "pct_bachelors_plus", "pct_poverty", "population_density", "median_age"];
const C = Object.fromEntries(others.map((id) => [id, V(id)]));
for (const id of others) out(`${id}: vs inactivity | vs work from home`, `${f2(rho(C[id], pi).rho)} | ${f2(rho(C[id], wfh).rho)}`);

console.log("\n── Holding other things equal (partial rank correlation)");
const gc = g.filter((k) => others.every((id) => k in C[id]));
const rw = ranks(gc.map((k) => wfh[k])), rp = ranks(gc.map((k) => pi[k]));
const R = (id) => ranks(gc.map((k) => C[id][k]));
out("counties with every control (n)", gc.length);
for (const [label, ids] of [
  ["none", []], ["median household income", ["median_household_income"]], ["bachelor's degree share", ["pct_bachelors_plus"]],
  ["income + bachelor's", ["median_household_income", "pct_bachelors_plus"]],
  ["income + bachelor's + density + median age", ["median_household_income", "pct_bachelors_plus", "population_density", "median_age"]],
]) { const X = ids.map(R); out(`partial ρ controlling for ${label}`, f2(pearson(residuals(rw, X), residuals(rp, X)))); }
const inc = C.median_household_income, byInc = [...gc].sort((a, b) => inc[a] - inc[b]);
for (let q = 0; q < 5; q++) {
  const part = byInc.slice(Math.floor((q * byInc.length) / 5), Math.floor(((q + 1) * byInc.length) / 5));
  out(`income fifth ${q + 1} ($${inc[part[0]]}–$${inc[part.at(-1)]}): ρ (n)`, `${f2(pearson(ranks(part.map((k) => wfh[k])), ranks(part.map((k) => pi[k]))))} (${part.length})`);
}

console.log("\n── Focus 1: Virginia (state FIPS 51)");
const va = rho(wfh, pi, (k) => k.startsWith("51"));
out("Virginia counties and independent cities: ρ (n)", `${f2(va.rho)} (${va.n})`);
for (const k of ["51013", "51107", "51059", "51003", "51071", "51035", "51077", "51167"])
  out(`${NAMES[k]} (${k}): WFH | inactive | median income | bachelor's`, `${wfh[k]}% | ${pi[k]}% | $${inc[k]} | ${C.pct_bachelors_plus[k]}%`);

console.log("\n── Focus 2: the northern Plains");
for (const [st, name] of [["46", "South Dakota"], ["38", "North Dakota"], ["30", "Montana"], ["31", "Nebraska"]]) {
  const r = rho(wfh, pi, (k) => k.startsWith(st)), ri = rho(inc, pi, (k) => k.startsWith(st));
  out(`${name}: ρ WFH vs inactivity (n) | ρ income vs inactivity`, `${f2(r.rho)} (${r.n}) | ${f2(ri.rho)}`);
}
const plains = (k) => ["46", "38", "30"].some((p) => k.startsWith(p));
out("SD + ND + MT pooled: ρ WFH vs inactivity (n)", `${f2(rho(wfh, pi, plains).rho)} (${rho(wfh, pi, plains).n})`);
out("SD + ND + MT pooled: ρ median income vs inactivity", f2(rho(inc, pi, plains).rho));
const dens = C.population_density;
for (const k of ["46105", "38043", "46021", "46063", "51059", "46121", "46102"])
  out(`${NAMES[k]} (${k}): WFH | inactive | income | density/sq mi`, `${wfh[k]}% | ${pi[k]}% | $${inc[k]} | ${dens[k]}`);
const sparse = (k) => dens[k] < 6, dense = (k) => dens[k] >= 6;
out("counties under 6 people/sq mi: ρ WFH vs inactivity (n)", `${f2(rho(wfh, pi, sparse).rho)} (${rho(wfh, pi, sparse).n})`);
out("counties 6+ people/sq mi: ρ WFH vs inactivity (n)", `${f2(rho(wfh, pi, dense).rho)} (${rho(wfh, pi, dense).n})`);
out("counties under 6 people/sq mi: median WFH (%)", f1(median(shared(wfh, pi, sparse).map((k) => wfh[k]))));
const rankWfh = [...g].sort((a, b) => wfh[b] - wfh[a]);
out("Perkins County, SD: rank by work from home (of n)", `${rankWfh.indexOf("46105") + 1} of ${g.length}`);
const sdTop = shared(wfh, pi, (k) => k.startsWith("46")).sort((a, b) => pi[b] - pi[a]).slice(0, 3);
out("South Dakota's highest inactivity rates", sdTop.map((k) => `${NAMES[k]} ${pi[k]}%`).join("; "));

console.log("\n── The main map's colors (the bivariate map's own tertile classes, @webgis/design classify)");
const { classify, classOf } = await import("@webgis/design");
const bx = classify(g.map((k) => wfh[k]), { method: "quantile", classes: 3 }), by = classify(g.map((k) => pi[k]), { method: "quantile", classes: 3 });
const cls = (k) => [Math.min(classOf(wfh[k], bx), 2), Math.min(classOf(pi[k], by), 2)];
const blue = g.filter((k) => cls(k)[0] === 2 && cls(k)[1] === 0), gold = g.filter((k) => cls(k)[0] === 0 && cls(k)[1] === 2);
out("tertile breaks: work from home | inactivity", `${bx.map(f1).join(", ")} | ${by.map(f1).join(", ")}`);
out("blue counties (top third WFH, bottom third inactivity)", blue.length);
out("  of which 100+ people per sq mi", blue.filter((k) => dens[k] >= 100).length);
const WEST = ["04", "06", "08", "16", "30", "32", "35", "41", "49", "53", "56"];
out("  of which in the 11 western states (AZ CA CO ID MT NV NM OR UT WA WY)", blue.filter((k) => WEST.includes(k.slice(0, 2))).length);
out("gold counties (bottom third WFH, top third inactivity)", gold.length);
const SOUTH = ["01", "05", "12", "13", "21", "22", "28", "37", "40", "45", "47", "48", "51", "54"];
out("  of which in AL AR FL GA KY LA MS NC OK SC TN TX VA WV", gold.filter((k) => SOUTH.includes(k.slice(0, 2))).length);
const wv = g.filter((k) => k.startsWith("54"));
out("West Virginia: counties in the top third for inactivity (gold, brown or dark) | of", `${wv.filter((k) => cls(k)[1] === 2).length} | ${wv.length}`);
const nova = ["51013", "51107", "51059", "51510", "51600", "51610", "51153", "51683", "51685"];
out("Northern Virginia (Arlington, Loudoun, Fairfax Co., Alexandria, Fairfax city, Falls Church, Prince William, Manassas, Manassas Park): blue", `${nova.filter((k) => cls(k)[0] === 2 && cls(k)[1] === 0).length} of ${nova.length}`);
const plainsDark = g.filter((k) => ["46", "38"].some((p) => k.startsWith(p)) && cls(k)[0] === 2 && cls(k)[1] === 2);
out("Dakotas: dark counties (top third on both)", plainsDark.map((k) => `${NAMES[k]} ${wfh[k]}%/${pi[k]}%`).join("; "));
for (const [st, name] of [["28", "Mississippi"], ["08", "Colorado"], ["53", "Washington"], ["41", "Oregon"]])
  out(`${name}: blue | gold | counties`, `${blue.filter((k) => k.startsWith(st)).length} | ${gold.filter((k) => k.startsWith(st)).length} | ${g.filter((k) => k.startsWith(st)).length}`);
