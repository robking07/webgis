// Instagram time-lapse (issue #441, D-<PR+100>): county average temperature, each decade from the
// 1970s to today, compared with that county's own 1970s average. Renders a vertical 1080x1920
// Reels MP4 with sharp (SVG → PNG) piped into ffmpeg.
//
//   node scripts/timelapse/warming.mts [--cache data/cache] [--out drafts/instagram/warming.mp4]
//     [--cover drafts/instagram/warming-cover.png] [--stats] [--still <seconds>]
// Also writes the cover (1080x1920) and its 4:5 grid crop (<cover>-4x5.png), uploaded as the Reel's cover.
//
// Inputs are files the climdiv and boundary ingests already cache: NOAA nClimDiv county monthly
// mean temperature (climdiv-tmpccy-*) and Census cb_2019 counties (pre-2022 Connecticut counties,
// which is what nClimDiv still uses) plus cb_2024 states. Lower 48 only: nClimDiv has no Hawaii,
// and Alaska would need an inset (shortcut: add an Alaska inset if a video is about Alaska).
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import * as shapefile from "shapefile";
import sharp from "sharp";
import { rampColors, THEMES } from "../../packages/design/src/index.ts";

const arg = (name: string, dflt: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const CACHE = arg("cache", "data/cache");
const OUT = arg("out", "drafts/instagram/warming.mp4");
const W = 1080, H = 1920, FPS = 30;

// ── Data ────────────────────────────────────────────────────────────────────
const NOAA_TO_FIPS: Record<string, string> = {
  "01": "01", "02": "04", "03": "05", "04": "06", "05": "08", "06": "09", "07": "10", "08": "12", "09": "13", "10": "16",
  "11": "17", "12": "18", "13": "19", "14": "20", "15": "21", "16": "22", "17": "23", "18": "24", "19": "25", "20": "26",
  "21": "27", "22": "28", "23": "29", "24": "30", "25": "31", "26": "32", "27": "33", "28": "34", "29": "35", "30": "36",
  "31": "37", "32": "38", "33": "39", "34": "40", "35": "41", "36": "42", "37": "44", "38": "45", "39": "46", "40": "47",
  "41": "48", "42": "49", "43": "50", "44": "51", "45": "53", "46": "54", "47": "55", "48": "56",
}; // 49 (Hawaii) / 50 (Alaska) left out: lower 48 only.

/** Decades shown, in order. The last one is the latest complete years ("Today"). */
const DECADES = [
  { label: "1970s", from: 1970, to: 1979 },
  { label: "1980s", from: 1980, to: 1989 },
  { label: "1990s", from: 1990, to: 1999 },
  { label: "2000s", from: 2000, to: 2009 },
  { label: "2010s", from: 2010, to: 2019 },
  { label: "2020s", from: 2020, to: 2025 },
];

const file = readdirSync(CACHE).filter((f) => /^climdiv-tmpccy-v[\d.]+-\d{8}$/.test(f)).sort().pop();
if (!file) throw new Error(`no climdiv-tmpccy file in ${CACHE} (run the climdiv ingest first)`);
const annual = new Map<string, Map<number, number>>(); // geoid → year → annual mean °F
for (const line of readFileSync(join(CACHE, file), "utf8").split("\n")) {
  if (line.length < 11) continue;
  const fips = NOAA_TO_FIPS[line.slice(0, 2)];
  if (!fips) continue;
  const m = line.slice(11).trim().split(/\s+/).map(Number);
  if (m.length < 12 || m.some((v) => !Number.isFinite(v) || v === -99.9)) continue; // partial year
  const geoid = fips + line.slice(2, 5);
  (annual.get(geoid) ?? annual.set(geoid, new Map()).get(geoid)!).set(+line.slice(7, 11), m.reduce((a, b) => a + b, 0) / 12);
}
const lastYear = [...annual.values()].reduce((a, y) => Math.max(a, ...y.keys()), 0);
DECADES.at(-1)!.to = Math.min(DECADES.at(-1)!.to, lastYear);

/** geoid → change in °F vs the 1970s, one value per decade. */
const change = new Map<string, number[]>();
for (const [geoid, years] of annual) {
  const means = DECADES.map(({ from, to }) => {
    const v = [...years].filter(([y]) => y >= from && y <= to).map(([, t]) => t);
    return v.length === to - from + 1 ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
  });
  if (means.every(Number.isFinite)) change.set(geoid, means.map((m) => m - means[0]));
}
const today = [...change.values()].map((c) => c.at(-1)!);
const warmer = today.filter((d) => d > 0).length;
const avg = today.reduce((a, b) => a + b, 0) / today.length;
const STATS = { counties: today.length, warmer, avg: +avg.toFixed(2), lastYear,
  pctWarmer: +(100 * warmer / today.length).toFixed(1),
  over2: today.filter((d) => d >= 2).length,
  decadeAvg: DECADES.map((_, i) => +([...change.values()].reduce((a, c) => a + c[i], 0) / change.size).toFixed(2)) };
console.log(JSON.stringify(STATS));
if (process.argv.includes("--stats")) process.exit(0);

// ── Geometry: Albers equal-area (lower-48 parallels), simplified to whole pixels ──────────────
const rad = Math.PI / 180, p1 = 29.5 * rad, p2 = 45.5 * rad, p0 = 37.5 * rad, l0 = -96 * rad;
const n = (Math.sin(p1) + Math.sin(p2)) / 2, C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
const rho0 = Math.sqrt(C - 2 * n * Math.sin(p0)) / n;
const albers = ([lon, lat]: number[]) => {
  const rho = Math.sqrt(C - 2 * n * Math.sin(lat * rad)) / n, th = n * (lon * rad - l0);
  return [rho * Math.sin(th), rho0 - rho * Math.cos(th)];
};
const LOWER48 = (st: string) => !["02", "15", "60", "66", "69", "72", "78"].includes(st);

async function rings(shp: string, key: (p: Record<string, string>) => string | null) {
  const out: Array<{ key: string; rings: number[][][] }> = [];
  const src = await shapefile.open(shp, shp.replace(/\.shp$/, ".dbf"));
  for (let r = await src.read(); !r.done; r = await src.read()) {
    const k = key(r.value.properties);
    if (!k) continue;
    const g = r.value.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    out.push({ key: k, rings: polys.flat().map((ring: number[][]) => ring.map(albers)) });
  }
  return out;
}
const counties = await rings(join(CACHE, "cb_2019_us_county_500k/cb_2019_us_county_500k.shp"),
  (p) => (LOWER48(p.STATEFP) ? p.GEOID : null));
const states = await rings(join(CACHE, "cb_2024_us_state_500k/cb_2024_us_state_500k.shp"),
  (p) => (LOWER48(p.STATEFP) ? p.STUSPS : null));

// Fit the lower 48 into the map box.
const MAP = { x: 40, y: 640, w: 1000, h: 640 };
let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
for (const c of counties) for (const ring of c.rings) for (const [x, y] of ring) {
  x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
}
const k = Math.min(MAP.w / (x1 - x0), MAP.h / (y1 - y0));
const ox = MAP.x + (MAP.w - k * (x1 - x0)) / 2, oy = MAP.y + (MAP.h - k * (y1 - y0)) / 2;
const toPath = (rs: number[][][]) => rs.map((ring) => {
  const pts: string[] = [];
  for (const [x, y] of ring) {
    const s = `${Math.round(ox + k * (x - x0))} ${Math.round(oy + k * (y1 - y))}`; // y flips: north up
    if (pts.at(-1) !== s) pts.push(s);
  }
  return pts.length > 2 ? `M${pts.join("L")}Z` : "";
}).join("");
const countyPaths = counties.map((c) => ({ geoid: c.key, d: toPath(c.rings) })).filter((c) => c.d);
const stateLines = states.map((s) => toPath(s.rings)).join("");

// ── Style: dark theme + the diverging Red–Blue ramp, red = warmer ────────────────────────────
const T = THEMES.dark;
const COLORS = rampColors("rdbu", 7).reverse(); // rdbu runs red → blue; flip so warm is red
const BREAKS = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5]; // °F change vs the 1970s; middle class = within ±0.5°F
const classOf = (d: number) => BREAKS.filter((b) => d >= b).length;
const FONT = "DejaVu Sans"; // shortcut: system font; switch to the site font if one gets bundled
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (x: number, y: number, size: number, fill: string, s: string, o = 1, weight = 700, anchor = "middle") =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" fill-opacity="${o}" text-anchor="${anchor}">${esc(s)}</text>`;

/** One map layer: counties colored by change at fractional decade index t (0 = 1970s). */
function mapSvg(t: number, opacity = 1) {
  const i = Math.min(Math.floor(t), DECADES.length - 2), f = t - i;
  const groups = COLORS.map(() => [] as string[]);
  const missing: string[] = [];
  for (const c of countyPaths) {
    const v = change.get(c.geoid);
    if (!v) { missing.push(c.d); continue; }
    groups[classOf(v[i] + (v[i + 1] - v[i]) * f)].push(c.d);
  }
  return `<g opacity="${opacity}">` +
    groups.map((ds, ci) => (ds.length ? `<path d="${ds.join("")}" fill="${COLORS[ci]}"/>` : "")).join("") +
    (missing.length ? `<path d="${missing.join("")}" fill="${T.map.land}"/>` : "") +
    `<path d="${stateLines}" fill="none" stroke="${T.ui.bg}" stroke-width="1.6" stroke-linejoin="round"/></g>`;
}

function legend(o: number) {
  const y = 1330, sw = 120, x = W / 2 - (sw * 7) / 2;
  const labels = ["", "", "", "same", "+1°", "+2°", "+3°F"]; // under each class; middle = within ±0.5°F
  return `<g opacity="${o}">` + COLORS.map((c, i) => `<rect x="${x + i * sw}" y="${y}" width="${sw - 4}" height="22" rx="3" fill="${c}"/>`).join("") +
    labels.map((l, i) => (l ? text(x + i * sw + sw / 2 - 2, y + 58, 28, T.ui.textMuted, l, 1, 400) : "")).join("") +
    text(x, y + 58, 28, T.ui.textMuted, "cooler", 1, 400, "start") + `</g>`;
}

// ── The Mapwich mark (apps/web/src/components/Logo.tsx, 64 grid), with the pick dropped by dy ──
/** Pick spans y 8–56 when in place. It shows as ink above the solid layer (to 13.5) and below the
 *  open layer (from 47), as a cut-out inside the solid layer (15.5–27), and is hidden between. */
function pickSegs(dy: number) {
  const clip = (a: number, b: number) => [Math.max(a, 8 + dy), Math.min(b, 56 + dy)];
  const ok = ([a, b]: number[]) => b - a > 0.01;
  return { ink: [clip(-Infinity, 13.5), clip(47, Infinity)].filter(ok), cut: [clip(15.5, 27)].filter(ok) };
}
assert.deepEqual(pickSegs(0), { ink: [[8, 13.5], [47, 56]], cut: [[15.5, 27]] }); // in place = Logo.tsx
const line = ([a, b]: number[], stroke = "") => `<line x1="32" y1="${a}" x2="32" y2="${b}"${stroke}/>`;

/** The mark at `size` px, centered on cx with its grid top at y; drop 0 = pick a full length above, 1 = in place. */
function logo(cx: number, y: number, size: number, drop: number, o: number) {
  const { ink, cut } = pickSegs(-48 * (1 - drop)), ic = T.ui.splashInk;
  return `<g opacity="${o}" transform="translate(${cx - size / 2} ${y}) scale(${size / 64})" fill="none" stroke="${ic}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">` +
    `<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff" stroke="none"/>${cut.map((s) => line(s, ' stroke="#000"')).join("")}</mask>` +
    ink.map((s) => line(s)).join("") +
    `<path d="M9 27 L32 15.5 L55 27 L32 38.5 Z" fill="${ic}" stroke="none" mask="url(#cut)"/><path d="M10 35 L32 46 L54 35"/></g>`;
}

// ── Timeline (seconds) ───────────────────────────────────────────────────────────────────────
const STEP = 1.5, MORPH = 0.6, LEAD = 0.5;              // time per decade, color morph, 1970s hold cut short
const MAP_END = STEP * DECADES.length - LEAD;           // 8.5 s: opens straight on the map + title
const STAT_END = MAP_END + 2.8, END = STAT_END + 4.2;    // final stat, then the logo end card (~15.5 s)
const LOGO_IN = STAT_END + 1.7, DROP = 1;               // end card fades in once the stat is gone; pick drops for DROP s
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const fade = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const fmt = (d: number) => `+${d.toFixed(1)}°F`;
const title = (o: number) => text(W / 2, 300, 60, T.ui.splashInk, "Is your county hotter", o) + text(W / 2, 372, 60, COLORS[5], "than in the 1970s?", o);

function frame(t: number) {
  const parts: string[] = [`<rect width="${W}" height="${H}" fill="${T.ui.splashBg}"/>`];
  // Decade index: holds on each decade, morphs in the last MORPH seconds of its step.
  const s = t + LEAD, di = Math.min(Math.floor(s / STEP), DECADES.length - 1);
  const into = s - di * STEP;
  const td = di >= DECADES.length - 1 ? di : di + ease((into - (STEP - MORPH)) / MORPH);
  const end = fade(t, STAT_END, STAT_END + 0.35);
  parts.push(mapSvg(td, 1 - 0.88 * end));

  if (t < STAT_END + 0.4) { // Title + year counter + legend, all on screen from frame 0
    const o = 1 - end;
    const li = Math.round(td), label = DECADES[li].label; // label flips halfway through the morph
    const avgNow = STATS.decadeAvg[li];
    parts.push(title(o),
      text(W / 2, 590, 180, T.ui.splashInk, label === "2020s" ? "Today" : label, o),
      text(W / 2, 1490, 64, COLORS[Math.min(classOf(avgNow), 5)], label === "1970s" ? "starting point" : `avg ${fmt(avgNow)}`, o * (t < STAT_END ? 1 : 0)),
      legend(o));
  }
  if (t >= STAT_END - 0.1) { // Final stat, then the end card
    const so = fade(t, STAT_END - 0.1, STAT_END + 0.3) * (1 - fade(t, STAT_END + 1.4, STAT_END + 1.7));
    parts.push(text(W / 2, 760, 64, T.ui.splashInk, "Since the 1970s,", so, 400),
      text(W / 2, 920, 150, COLORS[5], `all ${STATS.counties.toLocaleString("en-US")}`, so),
      text(W / 2, 1020, 64, T.ui.splashInk, "counties in the lower 48", so, 400),
      text(W / 2, 1110, 64, T.ui.splashInk, "got warmer.", so),
      text(W / 2, 1260, 54, T.ui.textMuted, `Average: ${fmt(STATS.avg)}`, so, 400));
    const eo = fade(t, LOGO_IN, LOGO_IN + 0.4), drop = 1 - (1 - Math.min(1, Math.max(0, (t - LOGO_IN) / DROP))) ** 3; // ease-out
    parts.push(logo(W / 2, 480, 320, drop, eo), text(W / 2, 880, 112, T.ui.splashInk, "mapwich.org", eo),
      text(W / 2, 970, 44, T.ui.splashTagline, "See your county's map", eo, 400),
      text(W / 2, 1420, 30, T.ui.textMuted, `Data: NOAA nClimDiv county average temperature, 1970–${lastYear}.`, eo, 400),
      text(W / 2, 1464, 30, T.ui.textMuted, `Each county vs. its own 1970s average. 2020s = 2020–${lastYear}.`, eo, 400));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join("")}</svg>`;
}

/** The Reel's cover (Instagram's "first slide"): today's map under the title. Everything sits inside
 *  the middle 1350 px, so the 4:5 grid crop (y 285–1635) loses nothing. */
function cover() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${T.ui.splashBg}"/>` +
    mapSvg(DECADES.length - 1) + legend(1) +
    text(W / 2, 400, 86, T.ui.splashInk, "Is your county") + text(W / 2, 505, 86, T.ui.splashInk, "hotter than it was") +
    text(W / 2, 610, 86, COLORS[5], "in the 1970s?") +
    text(W / 2, 1490, 56, COLORS[5], `avg ${fmt(STATS.decadeAvg.at(-1)!)} since the 1970s`) +
    logo(W / 2 - 150, 1528, 72, 1, 1) + text(W / 2 - 108, 1582, 44, T.ui.splashInk, "mapwich.org", 1, 700, "start") + `</svg>`;
}

// ── Render: PNG frames piped into ffmpeg ─────────────────────────────────────────────────────
const COVER = arg("cover", "drafts/instagram/warming-cover.png");
mkdirSync(dirname(COVER), { recursive: true });
const coverPng = await sharp(Buffer.from(cover())).png().toBuffer();
await sharp(coverPng).toFile(COVER);
await sharp(coverPng).extract({ left: 0, top: (H - 1350) / 2, width: W, height: 1350 }).toFile(COVER.replace(/\.png$/, "-4x5.png"));

if (process.argv.includes("--still")) { // one frame for checking layout: --still <seconds>
  const at = +arg("still", "0");
  await sharp(Buffer.from(frame(at))).png().toFile(OUT.replace(/\.mp4$/, `-${at}s.png`));
  process.exit(0);
}
mkdirSync(dirname(OUT), { recursive: true });
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", `${FPS}`, "-i", "-",
  "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high",
  "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", OUT], { stdio: ["pipe", "inherit", "inherit"] });
const total = Math.round(END * FPS);
let last = "", lastPng: Buffer | null = null;
for (let f = 0; f < total; f++) {
  const svg = frame(f / FPS);
  if (svg !== last) { lastPng = await sharp(Buffer.from(svg)).png({ compressionLevel: 1 }).toBuffer(); last = svg; }
  if (!ff.stdin.write(lastPng)) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
console.log(`wrote ${OUT} (${total} frames, ${END.toFixed(1)} s)`);
