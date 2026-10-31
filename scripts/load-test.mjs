#!/usr/bin/env node
// Load test (issue #366): ~1,000 simulated visitors against mapwich.org, ramped up gradually.
// Usage: node scripts/load-test.mjs [--visitors 1000] [--minutes 3] [--base https://mapwich.org]
// Reports p50/p95 latency, error rate and 5xx, split into site pages (Vercel) and map files (tiles.mapwich.org, Cloudflare R2).
// Stops at the first 429 or when errors pass 5% of the last 50 requests (Vercel Hobby limits).
// shortcut: a visit is the HTML plus the map's own data files only. It skips JS/CSS chunks (hashed, CDN-cached),
// basemap tiles (openfreemap.org, not ours), panning/zooming, a place click's detail files, and /api/geocode
// (never load-tested). Upgrade to a headless-browser run if real page weight matters.
import assert from "node:assert";

const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : dflt; };
const VISITORS = Number(arg("visitors", 1000));
const MINUTES = Number(arg("minutes", 3));
const BASE = arg("base", "https://mapwich.org");
const TILES = "https://tiles.mapwich.org";
const ORIGIN = { Origin: "https://mapwich.org" }; // R2's CORS only answers the production origins

const DATASETS = ["median_household_income", "pct_poverty", "mean_commute_minutes", "median_gross_rent", "pct_bachelors_plus"];
const PLACES = ["27053", "27123", "06037", "17031", "48201", "36061"];
const SPECIALS = ["holmes-county-bikes", "traffic-deaths", "acs-explainer"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// What a map visit loads besides the page: the values for the first view and the PMTiles headers/first tiles.
const mapFiles = (d) => [
  [`${TILES}/values/${d}/state.json`],
  [`${TILES}/values/${d}/county.json`],
  [`${TILES}/county.pmtiles`, "bytes=0-16383"],
  [`${TILES}/tract.pmtiles`, "bytes=0-16383"],
  [`${TILES}/state.pmtiles`, "bytes=0-16383"],
];
// Weighted like real use: most visitors land on the map; fewer open a place or a Special.
const JOURNEYS = [
  [0.3, () => { const d = pick(DATASETS); return [[`${BASE}/`], [`${BASE}/map?d=${d}`], ...mapFiles(d)]; }],
  [0.4, () => { const d = pick(DATASETS); return [[`${BASE}/map?d=${d}`], ...mapFiles(d)]; }],
  [0.15, () => [[`${BASE}/place/${pick(PLACES)}`]]],
  [0.15, () => [[`${BASE}/specials/${pick(SPECIALS)}`]]],
];
const journey = () => { let r = Math.random(); for (const [w, f] of JOURNEYS) if ((r -= w) <= 0) return f(); return JOURNEYS[0][1](); };

function pct(sorted, p) { return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : NaN; }
assert.equal(pct([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50), 6);
assert.equal(pct([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95), 10);

const stats = { site: [], tiles: [] }; // { ms, status }
const recent = [];
let stopReason = null;

async function hit([url, range]) {
  const group = url.startsWith(TILES) ? "tiles" : "site";
  const t0 = performance.now();
  let status = 0;
  try {
    const res = await fetch(url, { headers: { ...(range ? { Range: range } : {}), ...(group === "tiles" ? ORIGIN : {}), "User-Agent": "mapwich-load-test (#366)" }, signal: AbortSignal.timeout(20000) });
    status = res.status;
    await res.arrayBuffer();
  } catch { status = 0; }
  const ms = performance.now() - t0;
  stats[group].push({ ms, status });
  const bad = status === 0 || status >= 400;
  recent.push(bad); if (recent.length > 50) recent.shift();
  if (status === 429) stopReason ??= `429 from ${url}`;
  else if (recent.length === 50 && recent.filter(Boolean).length > 2.5) stopReason ??= "error rate over 5% in the last 50 requests";
}

async function visit() { for (const req of journey()) { if (stopReason) return; await hit(req); } }

// Linear ramp: arrivals per second grow from ~0 to 2x the average, so the peak comes at the end.
const T = MINUTES * 60_000;
const starts = Array.from({ length: VISITORS }, (_, i) => T * Math.sqrt((i + 1) / VISITORS));
const t0 = Date.now();
const running = [];
for (const at of starts) {
  if (stopReason) break;
  const wait = at - (Date.now() - t0);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  running.push(visit());
}
await Promise.all(running);

const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`${running.length} visitors in ${elapsed}s against ${BASE}${stopReason ? ` — STOPPED: ${stopReason}` : ""}`);
for (const [name, rows] of Object.entries(stats)) {
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  const err = rows.filter((r) => r.status === 0 || r.status >= 400);
  const byStatus = Object.entries(Object.groupBy(rows, (r) => r.status)).map(([s, a]) => `${s}:${a.length}`).join(" ");
  console.log(`${name.padEnd(5)} requests ${rows.length}  p50 ${pct(ms, 50).toFixed(0)} ms  p95 ${pct(ms, 95).toFixed(0)} ms  max ${ms.at(-1)?.toFixed(0)} ms  errors ${(100 * err.length / (rows.length || 1)).toFixed(2)}%  5xx ${rows.filter((r) => r.status >= 500).length}  [${byStatus}]`);
}
