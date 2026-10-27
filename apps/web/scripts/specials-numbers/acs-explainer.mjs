// Every number in apps/web/content/specials/acs-explainer.md. Not part of the app or the build; run by hand:
//   node apps/web/scripts/specials-numbers/acs-explainer.mjs
// Needs Node 18+ and internet. No API key: the Census API now wants one, so this reads the Census
// Bureau's public table-based summary files instead (one pipe-delimited file per table, every
// geography in the country), streaming each and keeping only the rows below. B08301 is about 88 MB,
// so a run takes a minute or two.
//
// Sources, all ACS 2020–2024 5-year (released by the Census Bureau; summary-file directory below):
//   B08301  Means of Transportation to Work (workers 16+): _001 total, _003 drove alone, _018 bicycle, _021 worked from home
//   B98001  Unweighted Housing Unit Sample: _001 initial addresses selected, _002 final interviews
//   B98021  Housing Unit Response Rates: _001 response rate
//   B25001  Housing Units: _001 total
// Geographies: United States (0100000US), Minnesota (0400000US27), Hennepin County (0500000US27053),
// Minneapolis city (1600000US2743000), Hennepin's 329 tracts (1400000US27053…) and block groups.
// Then it checks the percentages against Mapwich's own published values (tiles.mapwich.org), which
// the ingest derives from the same tables (data/ingest/src/acs.ts, Census proportion formula).
//
// Outside facts the piece cites (not computed here): 3,543,672 addresses selected in 2024, from
// https://www.census.gov/acs/www/methodology/sample-size-and-data-quality/sample-size/

const SF = "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData";
const TILES = "https://tiles.mapwich.org";
const KEEP = /^(0100000US|0400000US27|0500000US27053|1600000US2743000)\||^(1400000US27053|1500000US27053)/;

async function table(id) {
  const res = await fetch(`${SF}/acsdt5y2024-${id}.dat`);
  if (!res.ok) throw new Error(`${id}: ${res.status}`);
  const dec = new TextDecoder();
  let head = null, rest = "";
  const rows = {};
  const take = (line) => {
    if (!line) return;
    if (!head) { head = line.split("|"); return; }
    if (!KEEP.test(line)) return;
    const c = line.split("|"), o = {};
    head.forEach((h, i) => { if (i) o[h.replace(`${id.toUpperCase()}_`, "")] = c[i] === "" ? null : +c[i]; });
    rows[c[0]] = o;
  };
  for await (const chunk of res.body) {
    rest += dec.decode(chunk, { stream: true });
    const lines = rest.split("\n");
    rest = lines.pop();
    lines.forEach(take);
  }
  take(rest);
  return rows;
}
const tiles = async (p) => { const r = await fetch(`${TILES}/${p}`); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); };

const US = "0100000US", MN = "0400000US27", HC = "0500000US27053", MPLS = "1600000US2743000";
const isTract = (g) => g.startsWith("1400000US27053"), isBg = (g) => g.startsWith("1500000US27053");
const tractOf = (g) => g.slice(9, 20);

const f0 = (v) => Math.round(v).toLocaleString("en-US"), f1 = (v) => v.toFixed(1);
const out = (label, value) => console.log(`${label.padEnd(84)} ${value}`);
const head = (t) => console.log(`\n── ${t}`);
const cv = (e, m) => (e ? (m / 1.645 / Math.abs(e)) * 100 : null); // Census: SE = MOE / 1.645
const range = (e, m) => `${f0(Math.max(0, e - m))} to ${f0(e + m)}`;
const rss = (ms) => Math.sqrt(ms.reduce((a, m) => a + m * m, 0)); // MOE of a sum (handbook ch. 8, formula 1)
// MOE of a proportion (handbook ch. 8, formula 6; ratio formula if the radicand is negative), as the ingest does.
const pctMoe = (y, my, x, mx) => { const p = y / x; let r = my * my - p * p * mx * mx; if (r < 0) r = my * my + p * p * mx * mx; return (100 * Math.sqrt(r)) / x; };
const pct = (y, x) => (100 * y) / x;

const [b08301, b98001, b98021, b25001] = await Promise.all(["b08301", "b98001", "b98021", "b25001"].map(table));
const [shard, details, bgV, bgM] = await Promise.all([
  tiles("values/tracts/27053.json"), tiles("details/27.json"),
  tiles("values/pct_bike_commute/block_group.json"), tiles("values/pct_bike_commute/block_group.moe.json"),
]);
const tracts = Object.keys(b08301).filter(isTract);
const bgs = Object.keys(b08301).filter(isBg);

// ── 1. How the sample works ─────────────────────────────────────────────────────────────────────
head("Sample (B98001, B25001, B98021; 2020–2024)");
out("US housing units (B25001)", f0(b25001[US].E001));
out("US addresses selected in 2024 (census.gov sample-size page): 3,543,672 → 1 in", f0(b25001[US].E001 / 3543672));
out("US addresses selected over 5 years (B98001_001)", f0(b98001[US].E001));
out("US final interviews over 5 years (B98001_002)", f0(b98001[US].E002));
out("Hennepin housing units (B25001)", f0(b25001[HC].E001));
out("Hennepin addresses selected, 5 years (B98001_001)", f0(b98001[HC].E001));
out("  … 1 home in", f1(b25001[HC].E001 / b98001[HC].E001));
out("Hennepin final interviews, 5 years (B98001_002)", f0(b98001[HC].E002));
out("  … 1 home in", f1(b25001[HC].E001 / b98001[HC].E002));
out("Hennepin tracts", tracts.length);
out("  interviews per tract, average", f0(b98001[HC].E002 / tracts.length));
out("  homes each interview stands for, average (housing units ÷ interviews)", f1(b25001[HC].E001 / b98001[HC].E002));
out("Hennepin housing-unit response rate, % (B98021_001)", b98021[HC]?.E001);

// ── 2. Two tracts, bicycle commuting ────────────────────────────────────────────────────────────
const T = (code) => b08301[`1400000US27053${code}`];
for (const [code, label] of [["005902", "Tract 59.02 (just south of downtown Minneapolis)"], ["104001", "Tract 1040.01 (Southeast Minneapolis)"]]) {
  const r = T(code), mw = shard.pct_bike_commute[code];
  head(label);
  out("workers 16+ (B08301_001)", `${f0(r.E001)} ± ${f0(r.M001)}`);
  out("bike commuters (B08301_018)", `${f0(r.E018)} ± ${f0(r.M018)}  → ${range(r.E018, r.M018)}`);
  out("  CV of the count, %", f1(cv(r.E018, r.M018)));
  const p = pct(r.E018, r.E001), pm = pctMoe(r.E018, r.M018, r.E001, r.M001);
  out("share biking, % (computed)", `${p.toFixed(2)} ± ${pm.toFixed(2)}  → ${Math.max(0, p - pm).toFixed(1)}% to ${(p + pm).toFixed(1)}%`);
  out("share biking, % (Mapwich values/tracts/27053.json)", `${mw[0]} ± ${mw[1]}`);
  const kids = bgs.filter((g) => tractOf(g) === `27053${code}`);
  for (const g of kids) {
    const b = b08301[g], id = g.slice(9);
    out(`  block group ${id}: bikes / workers`, `${f0(b.E018)} ± ${f0(b.M018)} / ${f0(b.E001)} ± ${f0(b.M001)}; Mapwich ${bgV[id]} ± ${bgM[id]}`);
  }
  out("  block groups summed: bikes", `${f0(kids.reduce((a, g) => a + b08301[g].E018, 0))} ± ${f1(rss(kids.map((g) => b08301[g].M018)))} (published tract: ± ${r.M018})`);
}

// ── 3. All 329 tracts ───────────────────────────────────────────────────────────────────────────
head("Hennepin tracts, bike commuters (B08301_018)");
const zero = tracts.filter((g) => b08301[g].E018 === 0), some = tracts.filter((g) => b08301[g].E018 > 0);
out("tracts estimating zero bike commuters", zero.length);
out("  their margins", [...new Set(zero.map((g) => b08301[g].M018))].sort((a, b) => a - b).join(", "));
out("tracts with a margin larger than the estimate (zeros included)", tracts.filter((g) => b08301[g].M018 > b08301[g].E018).length);
out("tracts with some bike commuters", some.length);
out("  … of which margin > estimate", some.filter((g) => b08301[g].M018 > b08301[g].E018).length);
const cvs = some.map((g) => cv(b08301[g].E018, b08301[g].M018));
out("  … count CV under 15% / 15–30% / over 30%", `${cvs.filter((c) => c < 15).length} / ${cvs.filter((c) => c >= 15 && c <= 30).length} / ${cvs.filter((c) => c > 30).length}`);

// Mapwich's own grading of the percentages (packages/design/src/reliability.ts): CV over 30% → hatched,
// 15–30% caution, under 15% reliable; a zero is hatched only if its margin is over 5 points.
const grade = (v, m) => { if (v == null) return "no value"; if (v === 0) return m > 5 ? "hatched" : "zero, not graded"; const c = cv(v, m); return c > 30 ? "hatched" : c >= 15 ? "caution" : "reliable"; };
head("Mapwich grades, Hennepin tracts (values/tracts/27053.json, the hatch toggle's data)");
for (const ds of ["pct_bike_commute", "pct_work_from_home", "pct_drive_alone"]) {
  const n = {};
  for (const [v, m] of Object.values(shard[ds])) { const g = grade(v, m); n[g] = (n[g] ?? 0) + 1; }
  out(ds, ["reliable", "caution", "hatched", "zero, not graded", "no value"].map((k) => `${k} ${n[k] ?? 0}`).join(" · "));
}

// ── 4. Zooming out: combine and the margin shrinks ─────────────────────────────────────────────
head("Bike commuters, summed and published");
const sumE = tracts.reduce((a, g) => a + b08301[g].E018, 0);
out("sum of 329 tract estimates", f0(sumE));
out("  MOE by the sum formula (square, add, square root)", f0(rss(tracts.map((g) => b08301[g].M018))));
out("  if zero tracts count once (largest zero margin only; an analysts' rule, not Census guidance)", f0(rss([...some.map((g) => b08301[g].M018), Math.max(...zero.map((g) => b08301[g].M018))])));
for (const [g, label] of [[MPLS, "Minneapolis (published)"], [HC, "Hennepin County (published)"], [MN, "Minnesota (published)"]]) {
  const r = b08301[g];
  const p = pct(r.E018, r.E001), pm = pctMoe(r.E018, r.M018, r.E001, r.M001);
  out(label, `${f0(r.E018)} ± ${f0(r.M018)} (CV ${f1(cv(r.E018, r.M018))}%); share ${p.toFixed(2)}% ± ${pm.toFixed(2)} → ${(p - pm).toFixed(2)}% to ${(p + pm).toFixed(2)}%`);
}
out("Mapwich Hennepin share (details/27.json)", details["27053"].values.pct_bike_commute.map((v) => v.toFixed(3)).join(" ± "));
out("Mapwich Minnesota share (details/27.json)", details["27"].values.pct_bike_commute.map((v) => v.toFixed(3)).join(" ± "));

// ── 5. The contrast: a common answer ────────────────────────────────────────────────────────────
head("Drove alone (B08301_003), the same tracts");
const dcv = tracts.filter((g) => b08301[g].E003 > 0).map((g) => cv(b08301[g].E003, b08301[g].M003));
out("tract count CV under 15% / 15–30% / over 30%", `${dcv.filter((c) => c < 15).length} / ${dcv.filter((c) => c >= 15 && c <= 30).length} / ${dcv.filter((c) => c > 30).length}`);
for (const code of ["005902", "104001"]) {
  const r = T(code), mw = shard.pct_drive_alone[code];
  out(`tract ${code}: drove alone`, `${f0(r.E003)} ± ${f0(r.M003)} (CV ${f1(cv(r.E003, r.M003))}%); Mapwich share ${mw[0]}% ± ${mw[1]}`);
}

// ── 6. The zoom-out table, and one comparison ───────────────────────────────────────────────────
head("Zoom-out table: share of workers who bike (percent ± margin; margin as a share of the estimate)");
const bg3 = b08301["1500000US270530059023"];
const ladder = [
  ["Block group 3, tract 59.02", bg3], ["Tract 59.02", T("005902")], ["Minneapolis", b08301[MPLS]],
  ["Hennepin County", b08301[HC]], ["Minnesota", b08301[MN]],
];
for (const [label, r] of ladder) {
  const p = pct(r.E018, r.E001), pm = pctMoe(r.E018, r.M018, r.E001, r.M001);
  out(label, `${p.toFixed(1)}% ± ${pm.toFixed(2)} → ${Math.max(0, p - pm).toFixed(1)}% to ${(p + pm).toFixed(1)}%; margin = ${f0((100 * pm) / p)}% of estimate; workers ${f0(r.E001)}`);
}
head("Comparing the two tracts (handbook ch. 7: |difference| / √(SE₁² + SE₂²) against 1.645)");
{
  const [a, am] = shard.pct_bike_commute["005902"], [b, bm] = shard.pct_bike_commute["104001"];
  const z = Math.abs(a - b) / Math.sqrt((am / 1.645) ** 2 + (bm / 1.645) ** 2);
  out("difference, points", (a - b).toFixed(2));
  out("margin of the difference, points (√(MOE₁² + MOE₂²))", Math.sqrt(am * am + bm * bm).toFixed(2));
  out("Z (significant at 90% if over 1.645)", z.toFixed(2));
}

// ── 7. Check: every Hennepin tract's bike and drive-alone shares against Mapwich ────────────────
head("Check against Mapwich (values/tracts/27053.json): computed vs published, allowing for Mapwich rounding to 3–4 significant digits");
for (const [ds, col] of [["pct_bike_commute", "18"], ["pct_drive_alone", "03"]]) {
  let same = 0, off = [];
  for (const g of tracts) {
    const r = b08301[g], mw = shard[ds][g.slice(-6)];
    if (!r.E001) { if (mw?.[0] == null) same++; else off.push(g); continue; }
    const p = pct(r[`E0${col}`], r.E001), pm = pctMoe(r[`E0${col}`], r[`M0${col}`], r.E001, r.M001);
    const near = (a, b) => Math.abs(a - b) <= Math.max(0.01, 0.005 * Math.abs(b));
    if (mw && near(mw[0], p) && near(mw[1], pm)) same++; else off.push(g);
  }
  out(`${ds}: tracts matching / differing`, `${same} / ${off.length}${off.length ? " (" + off.slice(0, 5).join(", ") + ")" : ""}`);
}
