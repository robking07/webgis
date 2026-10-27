// Every Mapwich number in apps/web/content/specials/holmes-county-bikes.md, computed from Mapwich's own
// published files (the same ones the site reads). Run from anywhere:
//
//   node apps/web/scripts/specials-numbers/holmes-county-bikes.mjs            # reads https://tiles.mapwich.org
//   node apps/web/scripts/specials-numbers/holmes-county-bikes.mjs --local    # reads data/tiles.old where it has the file
//
// Files used (paths under the tiles base, as in apps/web/src/lib/values.ts and details.ts):
//   values/<id>/county.json, values/<id>/tract.json   headline values (ACS 2020-2024)
//   values/<id>/<stop>/county.json                    timeline stops (2014 = ACS 2010-2014, 2019 = 2015-2019)
//   details/<state>.json                              county names and county margins of error
//   values/tracts/<county>.json                       tract [value, margin of error] per dataset
//   geo/tracts/<county>.json                          tract name and a point inside it
//
// Reliability grades follow Mapwich's own rule (packages/design/src/reliability.ts, D-222):
// CV = (MOE / 1.645) / value x 100; under 15 reliable, 15-30 "use with caution", over 30 unreliable;
// a value of 0 is not graded.
//
// Needs Node 18+ (global fetch). No keys, no .env.local.
//
// NOT computed here (outside Mapwich; cited inline in the piece, retrieved 2026-10-12):
//   - City of Minneapolis bike-to-work share: 2.0% +/-0.3 (ACS 2020-2024) and 4.0% +/-0.3 (2015-2019);
//     work from home 26.2% and 5.8%. Census table S0801, place 160XX00US2743000, read through
//     data.census.gov/api/access/data/table?id=ACSST5Y2024.S0801&g=160XX00US2743000 (and ACSST5Y2019).
//   - Workers and bike commuters, ACS 2020-2024, table B08301 (_001 total, _018 bicycle), from the
//     Census table-based summary file www2.census.gov/programs-surveys/acs/summary_file/2024/
//     table-based-SF/data/5YRData/acsdt5y2024-b08301.dat: Minneapolis 239,419 +/-2,736 workers,
//     4,825 +/-606 by bike; Holmes County 20,065 +/-559 and 2,813 +/-450. (The Census API now needs a key.)
//     Holmes's share from these counts, 14.02% +/-2.21, matches Mapwich's value in section 1.
//   - League of American Bicyclists awards (bikeleague.org award database via its own site's
//     admin-ajax "sf_api" programs route, and the 2025 Minneapolis report card PDF) and PeopleForBikes
//     2026 City Ratings (cityratings.peopleforbikes.org/cities/<slug>).

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://tiles.mapwich.org";
const LOCAL = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "tiles.old");
const useLocal = process.argv.includes("--local");

const cache = new Map();
async function get(path) {
  if (cache.has(path)) return cache.get(path);
  const p = (async () => {
    if (useLocal) {
      try { return JSON.parse(await readFile(join(LOCAL, path), "utf8")); } catch { /* not in the local copy: fall back to live */ }
    }
    const r = await fetch(`${BASE}/${path}`);
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.json();
  })();
  cache.set(path, p);
  return p;
}

// ---------- helpers ----------
const cv = (v, m) => (v == null || m == null || v === 0 ? null : (m / 1.645) / Math.abs(v) * 100);
const grade = (v, m) => { const c = cv(v, m); return c == null ? "not graded" : c > 30 ? "unreliable" : c >= 15 ? "use with caution" : "reliable"; };
const f1 = (x) => (x == null ? "n/a" : x.toFixed(1));
const f2 = (x) => (x == null ? "n/a" : x.toFixed(2));
const sorted = (obj) => Object.entries(obj).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const rankIn = (obj, g) => sorted(obj).findIndex(([k]) => k === g) + 1;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const km = (lon1, lat1, lon2, lat2) => {
  const R = 6371, rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};
const compass = (lon0, lat0, lon, lat) => {
  const dx = (lon - lon0) * Math.cos(lat0 * Math.PI / 180), dy = lat - lat0;
  const deg = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
  return ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"][Math.round(deg / 45) % 8];
};
const tractLabel = (geoid, geo) => (geo?.[geoid.slice(5)]?.[0] ?? `Tract ${geoid.slice(5)}`);
const h = (s) => console.log(`\n## ${s}`);

const BIKE = "pct_bike_commute";

// ---------- load ----------
const states = Object.keys(await get("geo/names.json")).filter((k) => /^\d{2}$/.test(k));
const details = {};
for (const st of states) {
  try { Object.assign(details, await get(`details/${st}.json`)); } catch { /* territories without a details file */ }
}
const name = (g) => details[g]?.name ?? g;
const countyMoe = (id, g) => details[g]?.values?.[id]?.[1] ?? null;
const county = async (id, stop) => get(stop ? `values/${id}/${stop}/county.json` : `values/${id}/county.json`);

const bikeC = await county(BIKE);
const bikeT = await get(`values/${BIKE}/tract.json`);

// ---------- 1. Counties ----------
h("1. Counties, bike to work (ACS 2020-2024)");
const bc = sorted(bikeC);
console.log(`counties with a value: ${bc.length}`);
console.log(`median county: ${f2(median(bc.map(([, v]) => v)))}%`);
console.log(`counties under 1%: ${bc.filter(([, v]) => v < 1).length} (${f1(bc.filter(([, v]) => v < 1).length / bc.length * 100)}% of counties)`);
console.log(`counties at 0: ${bc.filter(([, v]) => v === 0).length}`);
console.log("top 12 counties: rank | county | value ± MOE | CV | grade");
bc.slice(0, 12).forEach(([g, v], i) => {
  const m = countyMoe(BIKE, g);
  console.log(`  ${i + 1} | ${name(g)} (${g}) | ${f1(v)} ± ${f1(m)} | CV ${f1(cv(v, m))} | ${grade(v, m)}`);
});
const [hol, second] = [bikeC["39075"], bc[1][1]];
console.log(`Holmes ÷ second (${name(bc[1][0])}): ${f2(hol / second)}x`);
const relC = bc.filter(([g, v]) => grade(v, countyMoe(BIKE, g)) === "reliable");
console.log(`top 8 counties graded reliable (CV < 15):`);
relC.slice(0, 8).forEach(([g, v], i) => console.log(`  ${i + 1} | ${name(g)} | ${f1(v)} ± ${f1(countyMoe(BIKE, g))} | overall rank ${rankIn(bikeC, g)}`));
// Lower bound of Holmes's 90% interval vs the next county's upper bound.
const holM = countyMoe(BIKE, "39075"), lgM = countyMoe(BIKE, bc[1][0]);
console.log(`Holmes 90% range: ${f1(hol - holM)} to ${f1(hol + holM)}; ${name(bc[1][0])}: ${f1(second - lgM)} to ${f1(second + lgM)}`);

h("1b. Big-city and college-town counties for comparison");
for (const g of ["06075", "11001", "41051", "08013", "06113", "41003", "55025", "53033", "27053", "27123"]) {
  const v = bikeC[g], m = countyMoe(BIKE, g);
  console.log(`  ${name(g)} (${g}): ${f2(v)} ± ${f2(m)} | rank ${rankIn(bikeC, g)} | ${grade(v, m)}`);
}

// ---------- 2. Amish settlements (settlement-to-county lists from the Young Center's 2024 table) ----------
h("2. Counties named for the largest settlements (Young Center 2024 list), bike to work");
const settlements = {
  "Holmes County area (Coshocton / Holmes / Tuscarawas / Wayne)": ["39075", "39169", "39157", "39031"],
  "Elkhart/LaGrange (Elkhart / LaGrange / Noble IN)": ["18087", "18039", "18113"],
  "Arthur/Arcola (Coles / Douglas / Moultrie IL)": ["17041", "17029", "17139"],
  "Lancaster (Lancaster PA)": ["42071"],
  "Geauga County area (Ashtabula / Geauga / Portage / Trumbull OH)": ["39055", "39007", "39133", "39155"],
  "Allen County IN (scooter community per Amish America)": ["18003"],
  "Dover DE (Kent County; scooter community per Amish America)": ["10001"],
};
for (const [s, gs] of Object.entries(settlements)) {
  console.log(` ${s}`);
  for (const g of gs) {
    const v = bikeC[g], m = countyMoe(BIKE, g);
    console.log(`   ${name(g)}: ${f2(v)} ± ${f2(m)} | rank ${rankIn(bikeC, g)} of ${bc.length} | ${grade(v, m)}`);
  }
}

// Approximate residents: 2020 Census people per square mile x land area (both from Mapwich's files).
const dens = await county("census2020_pop_density");
console.log("approx. residents (2020 Census density x land area, rounded to the nearest thousand):");
for (const g of ["39075", "18087", "17041", "42071", "39055", "27053"]) {
  console.log(`   ${name(g)}: about ${Math.round(dens[g] * details[g].aland_sqmi / 1000).toLocaleString("en-US")},000`);
}

// ---------- 3. How people get to work: the table block's counties ----------
h("3. Commute mix (table block): value ± MOE, rank of all counties (1 = highest)");
const mixIds = [BIKE, "pct_walk_commute", "pct_carpool", "pct_drive_alone", "pct_zero_vehicle_households", "pct_work_from_home"];
const mix = {};
for (const id of mixIds) mix[id] = await county(id);
for (const g of ["39075", "18087", "17041", "42071", "39055", "27053"]) {
  console.log(` ${name(g)}`);
  for (const id of mixIds) {
    const v = mix[id][g], m = countyMoe(id, g);
    console.log(`   ${id}: ${f1(v)} ± ${f1(m)} | rank ${rankIn(mix[id], g)} of ${Object.keys(mix[id]).length} | lowest-rank ${Object.keys(mix[id]).length - rankIn(mix[id], g) + 1}`);
  }
}
console.log(`Holmes bike + walk: ${f1(bikeC["39075"] + mix.pct_walk_commute["39075"])}% ` +
  `(approx. MOE ± ${f1(Math.hypot(countyMoe(BIKE, "39075"), countyMoe("pct_walk_commute", "39075")))}, Census sum formula)`);
console.log(`counties with drive-alone below Holmes: ${sorted(mix.pct_drive_alone).filter(([, v]) => v < mix.pct_drive_alone["39075"]).length}`);

// ---------- 4. Holmes County tracts ----------
h("4. Holmes County tracts, bike to work (focus map 1)");
const holShard = await get("values/tracts/39075.json");
const holGeo = await get("geo/tracts/39075.json");
const [clon, clat] = [details["39075"].lon, details["39075"].lat];
const holRows = Object.entries(holShard[BIKE]).sort((a, b) => (b[1][0] ?? -1) - (a[1][0] ?? -1));
for (const [t, [v, m]] of holRows) {
  const gg = holGeo[t];
  console.log(`  ${gg?.[0] ?? t} | ${f1(v)} ± ${f1(m)} | CV ${f1(cv(v, m))} | ${grade(v, m)} | ${gg ? compass(clon, clat, gg[1], gg[2]) + " of county center" : ""} | walk ${f1(holShard.pct_walk_commute?.[t]?.[0])} ± ${f1(holShard.pct_walk_commute?.[t]?.[1])}`);
}
console.log(`Holmes tracts at 20% or more: ${holRows.filter(([, [v]]) => v >= 20).length} of ${holRows.length}; at 0: ${holRows.filter(([, [v]]) => v === 0).length}`);

// ---------- 5. Tracts nationwide ----------
h("5. Tracts nationwide, bike to work");
const bt = sorted(bikeT);
console.log(`tracts with a value: ${bt.length}; estimate of exactly 0: ${bt.filter(([, v]) => v === 0).length} (${f1(bt.filter(([, v]) => v === 0).length / bt.length * 100)}%)`);
// Margins live in the per-county shards; fetch every county with a tract at or above THRESH.
const THRESH = 15;
const hi = bt.filter(([, v]) => v >= THRESH);
const shardCounties = [...new Set(hi.map(([g]) => g.slice(0, 5)))];
const shards = {}, geos = {};
for (const c of shardCounties) {
  shards[c] = await get(`values/tracts/${c}.json`);
  try { geos[c] = await get(`geo/tracts/${c}.json`); } catch { geos[c] = null; }
}
const withMoe = hi.map(([g, v]) => { const m = shards[g.slice(0, 5)]?.[BIKE]?.[g.slice(5)]?.[1] ?? null; return { g, v, m, grade: grade(v, m), cv: cv(v, m) }; });
console.log(`tracts at ${THRESH}% or more: ${hi.length} (in ${shardCounties.length} counties); graded: ` +
  ["reliable", "use with caution", "unreliable", "not graded"].map((k) => `${k} ${withMoe.filter((r) => r.grade === k).length}`).join(", "));
const row = (r, i) => `  ${i + 1} | ${tractLabel(r.g, geos[r.g.slice(0, 5)])} | ${r.g} | ${f1(r.v)} ± ${f1(r.m)} | CV ${f1(r.cv)} | ${r.grade}`;
console.log("top 10 tracts by estimate, any reliability:");
withMoe.slice(0, 10).forEach((r, i) => console.log(row(r, i)));
const rel = withMoe.filter((r) => r.grade === "reliable");
console.log("top 10 tracts graded reliable (CV < 15):");
rel.slice(0, 10).forEach((r, i) => console.log(row(r, i)));
if (rel.length < 10) console.log("  (fewer than 10 reliable tracts above the threshold: lower THRESH)");
const notUnrel = withMoe.filter((r) => r.grade === "reliable" || r.grade === "use with caution");
console.log("top 10 tracts not graded unreliable (CV 30 or under):");
notUnrel.slice(0, 10).forEach((r, i) => console.log(row(r, i)));
console.log(`9768.02 detail: ${f2(holShard[BIKE]["976802"][0])} ± ${f2(holShard[BIKE]["976802"][1])}, CV ${f2(cv(...holShard[BIKE]["976802"]))}, ` +
  `90% range ${f1(holShard[BIKE]["976802"][0] - holShard[BIKE]["976802"][1])} to ${f1(holShard[BIKE]["976802"][0] + holShard[BIKE]["976802"][1])}`);

// ---------- 6. Minneapolis (Hennepin County) tracts ----------
h("6. Hennepin County tracts (focus map 2)");
// Reference points (outside Mapwich, approximate): Northrop Auditorium on the University of Minnesota's
// East Bank campus, and Nicollet Mall at 7th Street downtown. Used only to say how near a tract's point is.
const UMN = [-93.2353, 44.9765], DT = [-93.2735, 44.9765];
const henShard = await get("values/tracts/27053.json");
const henGeo = await get("geo/tracts/27053.json");
const henRows = Object.entries(henShard[BIKE]).filter(([, [v]]) => v != null).sort((a, b) => b[1][0] - a[1][0]);
console.log(`Hennepin tracts with a value: ${henRows.length}; at 5% or more: ${henRows.filter(([, [v]]) => v >= 5).length}; at 10% or more: ${henRows.filter(([, [v]]) => v >= 10).length}`);
console.log(`Hennepin tracts graded reliable with 2% or more: ${henRows.filter(([, [v, m]]) => v >= 2 && grade(v, m) === "reliable").length}`);
console.log(`Hennepin tracts at 0: ${henRows.filter(([, [v]]) => v === 0).length}`);
henRows.slice(0, 10).forEach(([t, [v, m]], i) => {
  const [n, lon, lat] = henGeo[t];
  console.log(`  ${i + 1} | ${n} | ${f1(v)} ± ${f1(m)} | CV ${f1(cv(v, m))} | ${grade(v, m)} | ${f1(km(lon, lat, ...UMN))} km from UMN point, ${f1(km(lon, lat, ...DT))} km from downtown point`);
});
const nearU = henRows.filter(([t]) => km(henGeo[t][1], henGeo[t][2], ...UMN) <= 3);
console.log(`Hennepin tracts more than 3 km from the UMN point: ${henRows.filter(([t]) => km(henGeo[t][1], henGeo[t][2], ...UMN) > 3).length}, of which at 0: ${henRows.filter(([t, [v]]) => v === 0 && km(henGeo[t][1], henGeo[t][2], ...UMN) > 3).length}`);
console.log(`tracts with their point within 3 km of the UMN point: ${nearU.length}; median bike share ${f1(median(nearU.map(([, [v]]) => v)))}%; ` +
  `rest of Hennepin median ${f1(median(henRows.filter(([t]) => km(henGeo[t][1], henGeo[t][2], ...UMN) > 3).map(([, [v]]) => v)))}%`);

// ---------- 7. Over time (timeline stops; no margins are published for them) ----------
h("7. Over time, bike to work by county: 2010-2014 | 2015-2019 | 2020-2024");
const t14 = await county(BIKE, "2014"), t19 = await county(BIKE, "2019");
for (const g of ["39075", "18087", "17041", "27053", "06075", "41051", "06113", "11001"]) {
  console.log(`  ${name(g)}: ${f2(t14[g])} | ${f2(t19[g])} | ${f2(bikeC[g])}   (rank ${rankIn(t14, g)} | ${rankIn(t19, g)} | ${rankIn(bikeC, g)})`);
}
console.log(`#1 in 2015-2019: ${name(sorted(t19)[0][0])} ${f2(sorted(t19)[0][1])}; #1 in 2010-2014: ${name(sorted(t14)[0][0])} ${f2(sorted(t14)[0][1])}`);
const w19 = await county("pct_work_from_home", "2019");
console.log(`Hennepin work from home: 2015-2019 ${f1(w19["27053"])}% | 2020-2024 ${f1(mix.pct_work_from_home["27053"])}%`);
console.log(`Holmes work from home: 2015-2019 ${f1(w19["39075"])}% | 2020-2024 ${f1(mix.pct_work_from_home["39075"])}% (change ${f2(mix.pct_work_from_home["39075"] - w19["39075"])} points)`);
const both = Object.keys(bikeC).filter((g) => g in t19);
console.log(`counties with both periods: ${both.length}; bike share lower in 2020-2024 than 2015-2019: ${both.filter((g) => bikeC[g] < t19[g]).length}`);

// ---------- 8. The Markdown tables in the piece (pasted verbatim) ----------
h("8. Markdown tables for the piece");
const G = { reliable: "Reliable", "use with caution": "Use with caution", unreliable: "Unreliable", "not graded": "Not graded" };
const short = (s) => s.replace(" County,", " Co.,").replace("Municipality,", "Mun.,");
console.log("\n| County | Bike to work (%) | Margin of error (points) | Grade |\n|---|---|---|---|");
bc.slice(0, 6).forEach(([g, v]) => { const m = countyMoe(BIKE, g); console.log(`| ${name(g)} | ${f1(v)} | ±${f1(m)} | ${G[grade(v, m)]} |`); });
console.log("\n| Census tract | Bike to work (%) | Margin of error (points) | Grade |\n|---|---|---|---|");
withMoe.slice(0, 8).forEach((r) => console.log(`| ${tractLabel(r.g, geos[r.g.slice(0, 5)]).replace(/^Tract /, "")} | ${f1(r.v)} | ±${f1(r.m)} | ${G[r.grade]} |`));

// ---------- 9. Where the reliable high tracts are (reference points are outside Mapwich, approximate) ----------
h("9. Reliable tracts at 15% or more: distance from the nearest campus reference point");
const CAMPUS = { "Stanford (Main Quad)": [-122.1697, 37.4275], "UC Davis (the Quad)": [-121.7617, 38.5382], "UC Santa Barbara (Storke Tower)": [-119.8489, 34.4120] };
for (const r of rel) {
  const pt = geos[r.g.slice(0, 5)]?.[r.g.slice(5)];
  if (!pt) continue;
  const [best, d] = Object.entries(CAMPUS).map(([n, p]) => [n, km(pt[1], pt[2], ...p)]).sort((a, b) => a[1] - b[1])[0];
  console.log(`  ${pt[0]}: ${f1(d)} km from ${best}`);
}
console.log(`Holmes ÷ San Francisco: ${f1(bikeC["39075"] / bikeC["06075"])}x`);
