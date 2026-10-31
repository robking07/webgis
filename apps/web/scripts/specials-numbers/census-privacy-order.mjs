// Every Mapwich number in apps/web/content/specials/census-privacy-order.md. Not part of the app or the
// build; run by hand (Node 18+, internet, no API key, about a minute):
//   node apps/web/scripts/specials-numbers/census-privacy-order.mjs
// On "publish", the lead moves it to apps/web/scripts/specials-numbers/<slug>.mjs.
//
// Reads only Mapwich's published files on https://tiles.mapwich.org (D-210, D-257), all from the
// U.S. Census Bureau's American Community Survey 2020–2024 5-year estimates:
//   values/<id>/<level>.json        { geoid: estimate }
//   values/<id>/<level>.moe.json    { geoid: 90% margin of error }
//   values/population_density/county.counts.json   { county: [population, its MOE, …] }
//   values/counts/tract/<county>.json → population_density: { tract: [population, its MOE, …] }
// Reliability grades use Mapwich's own rule (packages/design/src/reliability.ts, D-222):
//   CV = (MOE / 1.645) / |estimate| × 100; under 15 reliable, 15–30 caution, over 30 unreliable;
//   a zero is unreliable when its margin is over 5 (points), otherwise not graded.
//
// Outside facts the piece cites (dates, the order's terms, publication thresholds) are not computed
// here; each has a link in the draft and in notes.md.

const TILES = process.env.NEXT_PUBLIC_TILES_BASE_URL || "https://tiles.mapwich.org";
const get = async (p) => {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`${TILES}/${p}`);
    if (r.ok) return r.json();
    if (r.status === 404) return null;
  }
  throw new Error(`${p}: failed`);
};

// Mapwich's grading rule, copied from packages/design/src/reliability.ts.
function grade(v, m) {
  if (v == null || m == null) return null;
  if (v === 0) return m > 5 ? "unreliable" : null;
  const cv = (m / 1.645) / Math.abs(v) * 100;
  return cv > 30 ? "unreliable" : cv >= 15 ? "caution" : "reliable";
}
const cv = (v, m) => (v ? (m / 1.645) / Math.abs(v) * 100 : null);

const f0 = (v) => Math.round(v).toLocaleString("en-US");
const p0 = (a, b) => `${Math.round((100 * a) / b)}%`;
const p1 = (a, b) => `${((100 * a) / b).toFixed(1)}%`;
const out = (label, value) => console.log(`${label.padEnd(92)} ${value}`);
const head = (t) => console.log(`\n── ${t}`);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

// Planning measures the piece looks at (registry ids; all ACS 2020–2024 5-year).
const MEASURES = [
  ["pct_poverty", "Population below poverty"],
  ["pct_work_from_home", "Workers who work from home"],
  ["pct_renter_households", "Households that rent"],
  ["pct_zero_vehicle_households", "Households with no vehicle"],
  ["pct_limited_english", "Households with limited English"],
  ["pct_uninsured", "No health insurance"],
  ["pct_disability", "People with a disability"],
];
const STATES = { "01":"Alabama","02":"Alaska","04":"Arizona","05":"Arkansas","06":"California","08":"Colorado","09":"Connecticut","10":"Delaware","11":"District of Columbia","12":"Florida","13":"Georgia","15":"Hawaii","16":"Idaho","17":"Illinois","18":"Indiana","19":"Iowa","20":"Kansas","21":"Kentucky","22":"Louisiana","23":"Maine","24":"Maryland","25":"Massachusetts","26":"Michigan","27":"Minnesota","28":"Mississippi","29":"Missouri","30":"Montana","31":"Nebraska","32":"Nevada","33":"New Hampshire","34":"New Jersey","35":"New Mexico","36":"New York","37":"North Carolina","38":"North Dakota","39":"Ohio","40":"Oklahoma","41":"Oregon","42":"Pennsylvania","44":"Rhode Island","45":"South Carolina","46":"South Dakota","47":"Tennessee","48":"Texas","49":"Utah","50":"Vermont","51":"Virginia","53":"Washington","54":"West Virginia","55":"Wisconsin","56":"Wyoming","72":"Puerto Rico" };
const notPR = (g) => !g.startsWith("72"); // Puerto Rico left out throughout: the piece is about the 50 states + DC.

// ── Load ────────────────────────────────────────────────────────────────────────────────────────
const countyPop = await get("values/population_density/county.counts.json");
const data = {};
for (const [id] of MEASURES) {
  const [cv_, cm, tv, tm] = await Promise.all([`county.json`, `county.moe.json`, `tract.json`, `tract.moe.json`].map((f) => get(`values/${id}/${f}`)));
  data[id] = { county: [cv_, cm], tract: [tv, tm] };
}
const counties = Object.keys(countyPop).filter(notPR);
const pop = Object.fromEntries(counties.map((c) => [c, countyPop[c][0]]));

// Tract populations from the per-county count shards (about 40 MB compressed in all).
const tractPop = {};
{
  const queue = [...counties];
  await Promise.all(Array.from({ length: 24 }, async () => {
    while (queue.length) {
      const c = queue.pop();
      const s = await get(`values/counts/tract/${c}.json`);
      for (const [t, r] of Object.entries(s?.population_density ?? {})) tractPop[c + t] = r[0];
    }
  }));
}

// ── 1. County sizes and the ACS publication thresholds ──────────────────────────────────────────
head("Counties (50 states + DC), ACS 2020–2024 total population (B01001 via population_density counts)");
const n = counties.length;
out("Counties and county equivalents", f0(n));
const under = (k) => counties.filter((c) => pop[c] < k).length;
out("Under 65,000 people (1-year estimates threshold)", `${f0(under(65000))} (${p0(under(65000), n)})`);
out("Under 20,000 people (1-year Supplemental threshold)", `${f0(under(20000))} (${p0(under(20000), n)})`);
out("Under 5,000 people", `${f0(under(5000))} (${p0(under(5000), n)})`);
out("Under 1,000 people", `${f0(under(1000))}`);
const usPop = counties.reduce((a, c) => a + pop[c], 0);
const popUnder = (k) => counties.filter((c) => pop[c] < k).reduce((a, c) => a + pop[c], 0);
out("People in counties under 65,000", `${f0(popUnder(65000))} (${p0(popUnder(65000), usPop)} of ${f0(usPop)})`);
out("People in counties under 20,000", `${f0(popUnder(20000))} (${p1(popUnder(20000), usPop)})`);
const smallest = [...counties].sort((a, b) => pop[a] - pop[b]).slice(0, 5);
for (const c of smallest) out(`  smallest: ${c} (${STATES[c.slice(0, 2)]})`, f0(pop[c]));
const byState = {};
for (const c of counties) if (pop[c] < 5000) byState[c.slice(0, 2)] = (byState[c.slice(0, 2)] ?? 0) + 1;
out("States with the most counties under 5,000", Object.entries(byState).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s, k]) => `${STATES[s]} ${k}`).join(", "));

// ── 2. How sure the survey is, by county size ───────────────────────────────────────────────────
const BANDS = [["Under 5,000", 0, 5000], ["5,000 to 19,999", 5000, 20000], ["20,000 to 64,999", 20000, 65000], ["65,000 to 249,999", 65000, 250000], ["250,000 or more", 250000, Infinity]];
for (const id of ["pct_work_from_home", "pct_renter_households"]) {
  head(`${id}: county estimates by county population (Mapwich grades)`);
  const [v, m] = data[id].county;
  for (const [label, lo, hi] of BANDS) {
    const cs = counties.filter((c) => pop[c] >= lo && pop[c] < hi && v[c] != null && m[c] != null);
    const g = cs.map((c) => grade(v[c], m[c]));
    const unrel = g.filter((x) => x === "unreliable").length, rel = g.filter((x) => x === "reliable").length;
    const medMoe = median(cs.map((c) => m[c]));
    out(`  ${label}: counties | reliable | unreliable | median margin (points)`, `${f0(cs.length)} | ${p0(rel, cs.length)} | ${p0(unrel, cs.length)} | ±${medMoe.toFixed(1)}`);
  }
}

{
  const [v, m] = data.pct_work_from_home.county;
  const big = counties.filter((c) => pop[c] >= 65000 && v[c] != null && m[c] != null);
  out("pct_work_from_home: counties of 65,000+ graded unreliable (exact count)", `${big.filter((c) => grade(v[c], m[c]) === "unreliable").length} of ${f0(big.length)}`);
}

// ── 3. Tracts: how many estimates are already fragile ───────────────────────────────────────────
head("Tracts (50 states + DC): share of tract estimates Mapwich grades unreliable, and margin > estimate");
for (const [id, label] of MEASURES) {
  const [v, m] = data[id].tract;
  const ts = Object.keys(v).filter((t) => notPR(t) && v[t] != null && m[t] != null);
  const g = ts.map((t) => grade(v[t], m[t]));
  const unrel = g.filter((x) => x === "unreliable").length;
  const rel = g.filter((x) => x === "reliable").length;
  const wider = ts.filter((t) => m[t] > v[t]).length;
  out(`  ${label}: tracts | reliable | unreliable | margin > estimate`, `${f0(ts.length)} | ${f0(rel)} (${p0(rel, ts.length)}; ${p1(rel, ts.length)}) | ${f0(unrel)} (${p0(unrel, ts.length)}; ${p1(unrel, ts.length)}) | ${f0(wider)} (${p0(wider, ts.length)}; ${p1(wider, ts.length)})`);
}

// ── 4. Small tracts vs big tracts ───────────────────────────────────────────────────────────────
head("Tracts by population (ACS 2020–2024), work-from-home and poverty grades");
const tracts = Object.keys(tractPop).filter((t) => tractPop[t] > 0);
out("Tracts with a population figure (population > 0)", f0(tracts.length));
out("Median tract population", f0(median(tracts.map((t) => tractPop[t]))));
out("Tracts under 1,200 people (the Census Bureau's minimum for a tract)", f0(tracts.filter((t) => tractPop[t] < 1200).length));
const TB = [["Under 1,200", 0, 1200], ["1,200 to 2,999", 1200, 3000], ["3,000 to 4,999", 3000, 5000], ["5,000 or more", 5000, Infinity]];
for (const id of ["pct_work_from_home", "pct_poverty"]) {
  const [v, m] = data[id].tract;
  for (const [label, lo, hi] of TB) {
    const ts = tracts.filter((t) => tractPop[t] >= lo && tractPop[t] < hi && v[t] != null && m[t] != null);
    const unrel = ts.filter((t) => grade(v[t], m[t]) === "unreliable").length;
    out(`  ${id}, ${label}: tracts | unreliable | median margin`, `${f0(ts.length)} | ${p0(unrel, ts.length)} | ±${median(ts.map((t) => m[t])).toFixed(1)}`);
  }
}
// Tracts in vs outside big counties (65,000+): rural-ish vs metro-ish proxy, stated as county size only.
for (const id of ["pct_work_from_home"]) {
  const [v, m] = data[id].tract;
  for (const [label, test] of [["in counties under 20,000", (c) => pop[c] < 20000], ["in counties of 250,000 or more", (c) => pop[c] >= 250000]]) {
    const ts = Object.keys(v).filter((t) => notPR(t) && pop[t.slice(0, 5)] != null && test(t.slice(0, 5)) && m[t] != null);
    const unrel = ts.filter((t) => grade(v[t], m[t]) === "unreliable").length;
    out(`  ${id} tracts ${label}: tracts | unreliable`, `${f0(ts.length)} | ${p0(unrel, ts.length)}`);
  }
}

// ── 5. Example places for the text and focus maps ───────────────────────────────────────────────
head("Examples (work from home)");
const show = (c) => {
  const [v, m] = data.pct_work_from_home.county;
  const g = grade(v[c], m[c]);
  out(`  ${c} (${STATES[c.slice(0, 2)]}) pop | work from home ± | likely between | grade`,
    v[c] == null ? `${f0(pop[c])} | no estimate`
      : `${f0(pop[c])} | ${v[c]}% ± ${m[c]} | ${Math.max(0, v[c] - m[c]).toFixed(1)}% to ${Math.min(100, v[c] + m[c]).toFixed(1)}% | ${g}`);
};
for (const c of smallest) show(c);
out("  smallest county population MOE (Mapwich counts file)", smallest.map((c) => `${c} ±${countyPop[c][1]}`).join(", "));
for (const st of ["31", "20", "46", "38", "48", "30"]) {
  const cs = counties.filter((c) => c.startsWith(st));
  const [v, m] = data.pct_work_from_home.county;
  const unrel = cs.filter((c) => grade(v[c], m[c]) === "unreliable").length;
  out(`  ${STATES[st]}: counties | under 5,000 | work from home unreliable`, `${cs.length} | ${cs.filter((c) => pop[c] < 5000).length} | ${unrel}`);
}
// A big county for contrast, and the Sandhills counties named in the first focus map's caption.
show("17031"); // Cook County, Illinois
const sandhills = ["31005", "31117", "31009", "31091", "31075", "31113"]; // Arthur, McPherson, Blaine, Hooker, Grant, Logan (NE)
for (const c of sandhills) show(c);
out("  Those six Sandhills counties, total population", f0(sandhills.reduce((a, c) => a + pop[c], 0)));

// Second focus map: Douglas County, Nebraska (Omaha), by tract.
head("Douglas County, Nebraska (31055), tracts");
for (const [id, label] of MEASURES) {
  const [v, m] = data[id].tract;
  const ts = Object.keys(v).filter((t) => t.startsWith("31055") && m[t] != null);
  const unrel = ts.filter((t) => grade(v[t], m[t]) === "unreliable").length;
  const wider = ts.filter((t) => m[t] > v[t]).length;
  out(`  ${label}: tracts | unreliable | margin > estimate`, `${ts.length} | ${unrel} (${p0(unrel, ts.length)}) | ${wider} (${p0(wider, ts.length)})`);
}
{
  const [v, m] = data.pct_work_from_home.county;
  out("  Douglas County work from home (county estimate)", `${v["31055"]}% ± ${m["31055"]}, pop ${f0(pop["31055"])}, ${grade(v["31055"], m["31055"])}`);
  const [tv, tm] = data.pct_work_from_home.tract;
  const ts = Object.keys(tv).filter((t) => t.startsWith("31055") && tm[t] != null && tv[t] != null);
  out("  median work-from-home margin across Douglas County tracts (points)", `±${median(ts.map((t) => tm[t])).toFixed(1)}`);
  out("  Douglas County tracts with a work-from-home estimate", f0(ts.length));
  // The illustrative range in "Why open methods matter" (tract not named in the text): the widest margins.
  for (const t of [...ts].sort((a, b) => tm[b] - tm[a]).slice(0, 5)) out(`  wide work-from-home margin: tract ${t}`, `${tv[t]}% ± ${tm[t]} → likely ${Math.max(0, tv[t] - tm[t]).toFixed(1)}% to ${Math.min(100, tv[t] + tm[t]).toFixed(1)}% (pop ${f0(tractPop[t] ?? NaN)}, ${grade(tv[t], tm[t])})`);
}
