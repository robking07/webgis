// Every Mapwich number in apps/web/content/specials/traffic-deaths.md, computed from Mapwich's own exported
// values. Not part of the app or the build; run by hand from anywhere:
//   node apps/web/scripts/specials-numbers/traffic-deaths.mjs
// Reads each file from data/tiles (or data/tiles.old) if it's there, otherwise from the published
// copy at https://tiles.mapwich.org (the same files the site reads; timeline years are only there).
// Spearman ρ uses average ranks for ties; "within state" removes each state's mean rank, the same
// method as the Odd Pairings (data/ingest/src/insights.ts) and the work-from-home Special.
//
// Deaths are not exported as counts, only as rates. Counts are rebuilt the way the ingest made the
// rates (data/ingest/src/fars.ts): deaths per year = rate × population / 100,000, with population =
// ACS population density × land area (details/<state>.json `aland_sqmi`). Rebuilt 5-year county
// counts come out within a few hundredths of whole numbers, which checks the method.
// Years before 2020 use 2015–2019 ACS population (population_density@2019), as the ingest does.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOTS = [join(here, "../../../../data/tiles"), join(here, "../../../../data/tiles.old")];
const BASE = "https://tiles.mapwich.org";
async function get(path) {
  for (const r of ROOTS) if (existsSync(join(r, path))) return JSON.parse(readFileSync(join(r, path), "utf8"));
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}
const V = (id, level = "county", stop) => get(`values/${id}/${stop ? stop + "/" : ""}${level}.json`);
const NAMES = JSON.parse(readFileSync(join(here, "../../src/generated/names.json"), "utf8"));

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────
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
const ok = (v) => v !== null && v !== undefined && Number.isFinite(v);
const shared = (x, y, keep = () => true) => Object.keys(x).filter((g) => ok(x[g]) && ok(y[g]) && keep(g));
const rho = (x, y, keep) => { const g = shared(x, y, keep); return { rho: pearson(ranks(g.map((k) => x[k])), ranks(g.map((k) => y[k]))), n: g.length }; };
const withinState = (x, y) => {
  const g = shared(x, y), rx = ranks(g.map((k) => x[k])), ry = ranks(g.map((k) => y[k]));
  const demean = (r) => { const m = new Map(); g.forEach((k, i) => { const s = m.get(k.slice(0, 2)) ?? [0, 0]; s[0] += r[i]; s[1]++; m.set(k.slice(0, 2), s); }); return r.map((v, i) => { const [t, n] = m.get(g[i].slice(0, 2)); return v - t / n; }); };
  return pearson(demean(rx), demean(ry));
};
const median = (v) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const f0 = (v) => Math.round(v).toLocaleString("en-US"), f1 = (v) => v.toFixed(1), f2 = (v) => v.toFixed(2);
const pct = (a, b) => `${(100 * a / b).toFixed(1)}%`;
const out = (label, value) => console.log(`${label.padEnd(78)} ${value}`);
const head = (t) => console.log(`\n── ${t}`);

// ── data ────────────────────────────────────────────────────────────────────────────────────────
const STATES = Object.keys(NAMES).filter((g) => g.length === 2 && g !== "72");
const area = {}, where = {};
for (const st of [...STATES, "72"]) {
  let d; try { d = await get(`details/${st}.json`); } catch { continue; }
  for (const [g, v] of Object.entries(d)) { area[g] = v.aland_sqmi; where[g] = [v.lon, v.lat]; }
}
const [tf, tfS, pd, pdS, pd19S, vmt, c20, aian] = await Promise.all([
  V("traffic_fatalities"), V("traffic_fatalities", "state"), V("population_density"), V("population_density", "state"),
  V("population_density", "state", "2019"), V("vmt_per_capita"), V("census2020_pop_density"), V("pct_aian_nh"),
]);
const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const tfYearS = Object.fromEntries(await Promise.all(YEARS.map(async (y) => [y, await V("traffic_fatalities", "state", String(y))])));

const pop = (g) => (g.length === 2 ? pdS[g] : pd[g]) * area[g];
const deathsPerYear = (g, rate = tf[g]) => (rate * pop(g)) / 1e5;
const name = (g) => NAMES[g] ?? g;

// ── 1. The national picture (main map, opening) ────────────────────────────────────────────────
head("National, 2020–2024 average (state values, 50 states + DC)");
let D = 0, P = 0;
for (const s of STATES) if (ok(tfS[s])) { D += deathsPerYear(s, tfS[s]); P += pop(s); }
out("deaths per year, 2020–2024 average (rebuilt from state rates)", f0(D));
out("deaths, five years 2020–2024", f0(5 * D));
out("national rate per 100,000 residents", f2(1e5 * D / P));
const stRank = STATES.filter((s) => ok(tfS[s])).sort((a, b) => tfS[b] - tfS[a]);
out("highest states (rate)", stRank.slice(0, 5).map((s) => `${name(s)} ${f1(tfS[s])}`).join("; "));
out("lowest states (rate, lowest first)", stRank.slice(-5).reverse().map((s) => `${name(s)} ${f1(tfS[s])}`).join("; "));
out("Mississippi ÷ Massachusetts", f1(tfS["28"] / tfS["25"]));
out("Minnesota rate, and rank from lowest (of 51)", `${f1(tfS["27"])}, ${stRank.length - stRank.indexOf("27")}`);

head("Counties");
// The map's classes: quantile breaks as packages/design classify() makes them (simple-statistics quantileSorted).
const qs = (v, p) => { const i = v.length * p; return i % 1 ? v[Math.ceil(i) - 1] : (v[i - 1] + v[i]) / 2; };
const sortedRates = Object.values(tf).filter(ok).sort((a, b) => a - b);
const breaks = [0.2, 0.4, 0.6, 0.8].map((p) => qs(sortedRates, p));
out("map class breaks (5 quantile classes)", breaks.map(f1).join(", "));
const topClass = (g) => tf[g] >= breaks[3];
const cty = Object.keys(tf).filter((g) => ok(tf[g]));
out("counties with a value", cty.length);
out("Connecticut counties with no value", Object.keys(tf).filter((g) => g.startsWith("09") && !ok(tf[g])).length + Object.keys(pd).filter((g) => g.startsWith("09") && !(g in tf)).length);
out("median county rate", f1(median(cty.map((g) => tf[g]))));
let Dc = 0; for (const g of cty) Dc += deathsPerYear(g);
out("deaths per year assigned to a county (rebuilt)", f0(Dc));
out("share of national deaths with a county (rest: unknown county or Connecticut)", pct(Dc, D));

// ── 2. Year by year (markdown table) ────────────────────────────────────────────────────────────
head("Year by year, national (state single-year values; pre-2020 use 2015–2019 population)");
const yr = {};
for (const y of YEARS) {
  let d = 0, p = 0;
  for (const s of STATES) {
    const r = tfYearS[y][s]; if (!ok(r)) continue;
    const pp = y < 2020 ? pd19S[s] * area[s] : pop(s);
    d += (r * pp) / 1e5; p += pp;
  }
  yr[y] = { d, rate: 1e5 * d / p };
  out(`${y}: deaths (rebuilt), rate per 100,000`, `${f0(d)}   ${f1(yr[y].rate)}`);
}
out("2019 → 2021 change in deaths (rebuilt)", `${f0(yr[2021].d - yr[2019].d)} (${pct(yr[2021].d - yr[2019].d, yr[2019].d)})`);
out("2021 → 2024 change in deaths (rebuilt)", `${f0(yr[2024].d - yr[2021].d)} (${pct(yr[2024].d - yr[2021].d, yr[2021].d)})`);
out("2024 vs 2019 deaths (rebuilt)", pct(yr[2024].d - yr[2019].d, yr[2019].d));

// ── 3. Fewer people, higher rates (chart: bins x=population_density, y=traffic_fatalities, median) ─
head("Population density vs traffic death rate, by county");
const r1 = rho(pd, tf); out(`Spearman ρ, density vs death rate (n=${r1.n})`, f2(r1.rho));
out("within-state ρ", f2(withinState(pd, tf)));
const gD = shared(pd, tf).sort((a, b) => pd[a] - pd[b] || a.localeCompare(b));
const tenths = [];
for (let d = 0; d < 10; d++) {
  const part = gD.slice(Math.floor((d * gD.length) / 10), Math.floor(((d + 1) * gD.length) / 10));
  let dd = 0, pp = 0, miles = 0, dV = 0;
  for (const k of part) { dd += deathsPerYear(k); pp += pop(k); if (ok(vmt[k])) { miles += vmt[k] * pop(k) * 365; dV += deathsPerYear(k); } }
  tenths.push({ part, dd, pp, perMile: 1e8 * dV / miles });
  out(`tenth ${d + 1}: ${part.length} counties, ${pd[part[0]]}–${pd[part.at(-1)]} people/sq mi`,
    `median ${f1(median(part.map((k) => tf[k])))} | pooled ${f1(1e5 * dd / pp)} | ${f1(pp / 1e6)}M people | ${f0(dd)} deaths/yr | ${f2(tenths[d].perMile)} per 100M veh-mi`);
}
out("least dense ÷ densest tenth: pooled rate per resident; per 100M vehicle miles", `${f1((tenths[0].dd / tenths[0].pp) / (tenths[9].dd / tenths[9].pp))}; ${f1(tenths[0].perMile / tenths[9].perMile)}`);
out("least dense tenth: median ÷ densest tenth median", f1(median(tenths[0].part.map((k) => tf[k])) / median(tenths[9].part.map((k) => tf[k]))));
const bucket = (lo, hi) => {
  const ks = gD.filter((k) => pd[k] >= lo && pd[k] < hi);
  let dd = 0, pp = 0; for (const k of ks) { dd += deathsPerYear(k); pp += pop(k); }
  return { n: ks.length, dd, pp, rate: 1e5 * dd / pp };
};
let Pc = 0; for (const k of gD) Pc += pop(k);
for (const [lo, hi, label] of [[0, 50, "under 50 people/sq mi"], [500, Infinity, "500 or more people/sq mi"]]) {
  const b = bucket(lo, hi);
  out(`counties ${label}: n, people, share of people`, `${b.n}, ${f1(b.pp / 1e6)}M, ${pct(b.pp, Pc)}`);
  out(`counties ${label}: deaths/yr, share of county deaths, pooled rate`, `${f0(b.dd)}, ${pct(b.dd, Dc)}, ${f1(b.rate)}`);
}

head("Driving: vehicle miles per resident (FHWA HPMS 2024, counted roads)");
const r2 = rho(vmt, tf); out(`Spearman ρ, vehicle miles per resident vs death rate (n=${r2.n})`, f2(r2.rho));
out("within-state ρ", f2(withinState(vmt, tf)));
out("Spearman ρ, density vs vehicle miles per resident", f2(rho(pd, vmt).rho));
out("median county vehicle miles per resident per day", f1(median(Object.values(vmt).filter(ok))));
let dAll = 0, mAll = 0; for (const k of shared(vmt, tf)) { dAll += deathsPerYear(k); mAll += vmt[k] * pop(k) * 365; }
out("all counties: deaths per 100M vehicle miles (counted roads; 2020–24 deaths ÷ 2024 miles)", f2(1e8 * dAll / mAll));

// ── 4. West Texas focus map and the counting problem ───────────────────────────────────────────
head("Highest county rates and the small-number problem");
const top = [...cty].sort((a, b) => tf[b] - tf[a]);
for (const g of top.slice(0, 5)) out(`${name(g)}: rate, deaths 2020–24 (rebuilt), ACS residents`, `${f1(tf[g])}, ${f1(5 * deathsPerYear(g))}, ${f0(pop(g))}`);
out("counties with a rate above 100", top.filter((g) => tf[g] > 100).length);
out("  … of those, with fewer than 10,000 residents", top.filter((g) => tf[g] > 100 && pop(g) < 10000).length);
out("counties under 10,000 residents", cty.filter((g) => pop(g) < 10000).length);
const zero = cty.filter((g) => tf[g] === 0);
out("counties with no traffic deaths at all in 2020–2024", zero.length);

head("West Texas counties");
const show = (g) => out(`${name(g)} (${g})`, `rate ${f1(tf[g])} | deaths 2020–24 ${f1(5 * deathsPerYear(g))} | ACS pop ${f0(pop(g))} | 2020 Census pop ${f0(c20[g] * area[g])} | veh-mi/resident/day ${f1(vmt[g])} | ${f1(pd[g])} people/sq mi`);
for (const g of ["48301", "48229", "48109", "48173", "48317", "48389", "48135", "48329", "48141"]) show(g);
out("Texas state rate", f1(tfS["48"]));
const inBox = (g, [w, s0, e, n]) => where[g] && where[g][0] >= w && where[g][0] <= e && where[g][1] >= s0 && where[g][1] <= n;
const WTX = cty.filter((g) => g.startsWith("48") && inBox(g, [-106.7, 29.5, -101.0, 33.0]));
out("West Texas (TX counties, centroid west of 101°W, south of 33°N): n, in top fifth", `${WTX.length}, ${WTX.filter(topClass).length}`);
out("  … not in the top fifth", WTX.filter((g) => !topClass(g)).map((g) => `${name(g)} ${f1(tf[g])}`).join("; "));
out("  … four most populous of the 27 (ACS)", [...WTX].sort((x, y) => pop(y) - pop(x)).slice(0, 4).map((g) => `${name(g)} ${f0(pop(g))}`).join("; "));
out("Loving County: vehicle miles per resident ÷ national county median", f0(vmt["48301"] / median(Object.values(vmt).filter(ok))));
out("Hudspeth + Culberson deaths 2020–24 (rebuilt)", f1(5 * (deathsPerYear("48229") + deathsPerYear("48109"))));

// ── 5. Four Corners focus map ──────────────────────────────────────────────────────────────────
head("Four Corners (Navajo Nation counties) and Native-majority counties");
for (const g of ["04001", "04017", "04005", "35031", "35045", "49037", "35001"]) {
  out(`${name(g)} (${g})`, `rate ${f1(tf[g])} | deaths 2020–24 ${f1(5 * deathsPerYear(g))} | AIAN ${f1(aian[g])}% | veh-mi/resident/day ${f1(vmt[g])} | per 100M veh-mi ${f2(1e8 * deathsPerYear(g) / (vmt[g] * pop(g) * 365))}`);
}
out("Arizona, New Mexico, Utah state rates", `${f1(tfS["04"])}, ${f1(tfS["35"])}, ${f1(tfS["49"])}`);
for (const g of ["04001", "04017", "04005", "35031", "35045", "49037", "35006"]) out(`${name(g)} in the map's top fifth?`, topClass(g));
const fc = ["04001", "04017", "04005", "35031"];
let fcD = 0, fcP = 0; for (const g of fc) { fcD += deathsPerYear(g); fcP += pop(g); }
out("Apache + Navajo + Coconino + McKinley: deaths 2020–24 (rebuilt), pooled rate", `${f0(5 * fcD)}, ${f1(1e5 * fcD / fcP)}`);
const r3 = rho(aian, tf); out(`Spearman ρ, American Indian/Alaska Native share vs death rate (n=${r3.n})`, f2(r3.rho));
const ai = cty.filter((g) => ok(aian[g]) && aian[g] >= 25);
let aD = 0, aP = 0; for (const g of ai) { aD += deathsPerYear(g); aP += pop(g); }
out("counties where 25%+ of residents are AIAN (non-Hispanic): n, pooled rate", `${ai.length}, ${f1(1e5 * aD / aP)}`);
const aiAK = ai.filter((g) => g.startsWith("02"));
out("  … of those in Alaska; Alaska ones' median rate", `${aiAK.length}, ${f1(median(aiAK.map((g) => tf[g])))}`);
const aiL48 = ai.filter((g) => !g.startsWith("02"));
let lD = 0, lP = 0; for (const g of aiL48) { lD += deathsPerYear(g); lP += pop(g); }
out("  … outside Alaska: n, pooled rate", `${aiL48.length}, ${f1(1e5 * lD / lP)}`);
const big = cty.filter((g) => pop(g) >= 100000).sort((a, b) => tf[b] - tf[a]);
out("counties with 100,000+ residents (ACS)", big.length);
out("highest rate among them", big.slice(0, 3).map((g) => `${name(g)} ${f1(tf[g])} (AIAN ${f1(aian[g])}%)`).join("; "));
out("North Carolina state rate", f1(tfS["37"]));

// ── 6. The table block (computed by the site at build; listed here for the text) ───────────────
head("Table block counties");
for (const g of ["48301", "48229", "04001", "35031", "47157", "27053", "36061"]) out(`${name(g)} (${g})`, `rate ${f1(tf[g])} | veh-mi ${f1(vmt[g])} | density ${f1(pd[g])}`);
out("Shelby County, TN: ACS residents; rate ÷ national rate", `${f0(pop("47157"))}; ${f1(tf["47157"] / (1e5 * D / P))}`);
out("Shelby County rank among 100,000+ counties (highest first)", big.indexOf("47157") + 1);
const lowBig = big.slice(-3).reverse();
out("lowest rates among 100,000+ counties", lowBig.map((g) => `${name(g)} ${f1(tf[g])}`).join("; "));

// ── 7. Outside figures used in the text (typed from the cited sources, not Mapwich data) ──────
head("Outside figures (sources in the piece)");
const NHTSA_2023 = { killed: 40901, injured: 2442581 }; // DOT HS 813 705, Table 3
out("NHTSA 2023: people injured per person killed", f1(NHTSA_2023.injured / NHTSA_2023.killed));
