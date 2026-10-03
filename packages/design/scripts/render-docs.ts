// Renders docs/design-system.md and its SVG examples from the tokens, so the doc
// can't drift from what the app actually uses. Run: npm run docs -w @webgis/design
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  differenceCiede2000, filterDeficiencyDeuter, filterDeficiencyProt, filterDeficiencyTrit, formatHex, wcagContrast,
} from "culori";
import { RAMPS, rampColors, type RampDef, type RampId } from "../src/ramps.ts";
import { CONTRAST_RULES, THEMES, themeColor } from "../src/themes.ts";
import { BAND_REFERENCE_WIDTH, GEO_LEVELS, SIZE, LABEL } from "../src/sizing.ts";
import { LEGEND } from "../src/format.ts";
import { THRESHOLDS } from "./check.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const outDir = join(root, "docs/design-system");
mkdirSync(outDir, { recursive: true });

const de = differenceCiede2000();
const VISION: Record<string, (c: string) => string> = {
  "Normal vision": (c) => c,
  Protanopia: (c) => formatHex(filterDeficiencyProt(1)(c as never))!,
  Deuteranopia: (c) => formatHex(filterDeficiencyDeuter(1)(c as never))!,
  Tritanopia: (c) => formatHex(filterDeficiencyTrit(1)(c as never))!,
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const SW = 44, SH = 26, LABEL_W = 120;

function rampSvg(id: RampId, n: number): string {
  const rows = Object.entries(VISION);
  const w = LABEL_W + n * SW, h = rows.length * (SH + 6) + 4;
  const body = rows.map(([name, sim], r) => {
    const y = 2 + r * (SH + 6);
    const cells = rampColors(id, n).map((c, i) =>
      `<rect x="${LABEL_W + i * SW}" y="${y}" width="${SW - 2}" height="${SH}" rx="3" fill="${sim(c)}"/>`).join("");
    return `<text x="0" y="${y + SH / 2 + 4}" font-size="12" font-family="system-ui,sans-serif" fill="#5b5d63">${name}</text>${cells}`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

function bivSvg(): string {
  const c = rampColors("bivBlueGold", 9), S = 40;
  const sims = Object.entries(VISION);
  const blockW = 3 * S + 30, w = sims.length * blockW, h = 3 * S + 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` + sims.map(([name, sim], k) => {
    const ox = k * blockW;
    const cells = [2, 1, 0].flatMap((row, ry) => [0, 1, 2].map((col) =>
      `<rect x="${ox + col * S}" y="${ry * S}" width="${S - 2}" height="${S - 2}" rx="3" fill="${sim(c[row * 3 + col])}"/>`)).join("");
    return `${cells}<text x="${ox}" y="${3 * S + 18}" font-size="12" font-family="system-ui,sans-serif" fill="#5b5d63">${esc(name)}</text>`;
  }).join("") + `</svg>`;
}

function themeSvg(): string {
  const entries = (t: keyof typeof THEMES) => [...Object.entries(THEMES[t].ui).map(([k, v]) => [`ui.${k}`, v]), ...Object.entries(THEMES[t].map).map(([k, v]) => [`map.${k}`, v])];
  const rows = entries("light");
  const rowH = 22, w = 520, h = rows.length * rowH + 30;
  const col = (t: "light" | "dark", x: number) => entries(t).map(([k, v], i) =>
    `<rect x="${x}" y="${24 + i * rowH}" width="70" height="${rowH - 4}" rx="3" fill="${v}" stroke="#00000022"/><text x="${x + 78}" y="${24 + i * rowH + 13}" font-size="11" font-family="ui-monospace,monospace" fill="#5b5d63">${v}</text>`).join("");
  const names = rows.map(([k], i) => `<text x="0" y="${24 + i * rowH + 13}" font-size="11" font-family="ui-monospace,monospace" fill="#1b1c1e">${k}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><text x="170" y="14" font-size="12" font-weight="600" font-family="system-ui,sans-serif">Light</text><text x="350" y="14" font-size="12" font-weight="600" font-family="system-ui,sans-serif">Dark</text>${names}${col("light", 170)}${col("dark", 350)}</svg>`;
}

function minDe(id: RampId, n: number, sim: (c: string) => string, kind: string): number {
  const cs = rampColors(id, n).map(sim);
  let m = Infinity;
  if (kind === "sequential" || kind === "diverging") for (let i = 1; i < n; i++) m = Math.min(m, de(cs[i - 1], cs[i]));
  else for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) m = Math.min(m, de(cs[i], cs[j]));
  return m;
}

const sections: string[] = [];
const ramps = Object.values(RAMPS) as RampDef[];
for (const r of ramps) {
  const id = r.id as RampId;
  const n = r.kind === "bivariate" ? 9 : r.kind === "categorical" ? r.maxClasses : Math.min(5, r.maxClasses);
  if (r.kind !== "bivariate") writeFileSync(join(outDir, `ramp-${id}.svg`), rampSvg(id, n));
  const worst = Object.fromEntries(Object.entries(VISION).map(([v, sim]) => [v, Math.min(...Array.from({ length: r.maxClasses - r.minClasses + 1 }, (_, k) => minDe(id, r.minClasses + k, sim, r.kind)))]));
  sections.push(`### ${r.label} (\`${id}\`) · ${r.kind}, ${r.minClasses}–${r.maxClasses} classes

${r.kind === "bivariate" ? "![bivariate grid](design-system/biv.svg)" : `![${r.label}](design-system/ramp-${id}.svg)`}

Source: ${r.source}. Worst-case ${r.kind === "sequential" || r.kind === "diverging" ? "adjacent-class" : "any-pair"} ΔE2000 across certified class counts: ${Object.entries(worst).map(([v, d]) => `${v} **${d.toFixed(1)}**`).join(" · ")}.
`);
}
writeFileSync(join(outDir, "biv.svg"), bivSvg());
writeFileSync(join(outDir, "themes.svg"), themeSvg());

const contrastRows = Object.values(THEMES).flatMap((t) => CONTRAST_RULES.map(([fg, bg, min, purpose]) =>
  `| ${t.name} | ${purpose} | \`${fg}\` on \`${bg}\` | ${wcagContrast(themeColor(t, fg), themeColor(t, bg)).toFixed(2)} | ${min} |`));

const md = `# Cartographic design system

> Generated by \`npm run docs -w @webgis/design\` from \`packages/design\`. Don't edit by hand; change the tokens and re-run.

Every map layer gets its symbology from **its registry entry + these tokens**. There is no per-layer styling anywhere in the app (CLAUDE.md). The pieces:

| Module | What it holds |
|---|---|
| \`src/ramps.ts\` | Color ramps (sequential, diverging, categorical, bivariate), interpolated in OKLab to the requested class count |
| \`src/classify.ts\` | Classification: quantile, equal interval, Jenks (Ckmeans), manual |
| \`src/themes.ts\` | Light and dark UI + basemap colors, and the contrast rules they must pass |
| \`src/sizing.ts\` | Geography-level zoom bands, line/point sizes by zoom, label rules, motion |
| \`src/format.ts\` | Number formatting per unit, legend rules |
| \`src/style.ts\` | The basemap style and the thematic layer stack, both built only from the above |
| \`src/components/\` | The one Legend (+ bivariate legend), one Popup, one loading/empty/error StatusState |

## The accessibility gate

\`npm run check:design\` runs before every build (\`npm run build\`) and **fails the build** on any violation. It simulates protanopia, deuteranopia and tritanopia at full severity (Machado et al. 2009) and measures color difference with CIEDE2000:

- **Sequential / diverging:** every adjacent pair of classes ≥ ${THRESHOLDS.MIN_ADJ} ΔE under all four visions, at every certified class count; sequential lightness strictly monotonic; diverging lightness peaks at the midpoint.
- **Categorical:** every pair ≥ ${THRESHOLDS.MIN_CAT} ΔE.
- **Bivariate:** every pair of the 9 cells ≥ ${THRESHOLDS.MIN_BIV} ΔE.
- **Contrast:** WCAG ratios for text, labels and focus rings in both themes (table below).

Thresholds are logged as decision D-12. The rows in each example below are the same classes as seen with normal vision, then with each simulated deficiency.

## Ramps

${sections.join("\n")}
### Why the bivariate palette is home-made
None of the published 3×3 bivariate schemes tested passed all three simulated deficiencies (Stevens' blue–pink failed protanopia at 5.9). \`bivBlueGold\` is a bilinear OKLab grid whose corners were searched to maximize the closest pair under every simulation. Read it as blue = first dataset high, gold = second dataset high, dark = both high.

## Themes

Light and dark come from the same token structure; the basemap and the UI chrome both read them (as CSS variables via \`themeCssVars\`, and directly in \`basemapStyle\`).

![theme tokens](design-system/themes.svg)

| Theme | Purpose | Pair | Ratio | Required |
|---|---|---|---|---|
${contrastRows.join("\n")}

## Classification and legends

- Default: **${LEGEND.defaultMethod}**, ${LEGEND.defaultClasses} classes; each registry entry can override method and class count within the ramp's certified range.
- Breaks are computed **per geography level** (state, county and tract each get their own), so the legend always describes what's on screen. Its caption names the level.
- Class labels are text (\`< a\`, \`a – b\`, \`≥ z\`), so the legend never relies on color alone.
- "No data" is always shown, with a hatched swatch, so a gap never reads as a low value.
- **Skewed data:** when quantile breaks would land on the minimum (e.g. most tracts at exactly 0% transit commuting), the bottom class becomes "exactly the minimum" (labeled "0%") and the other classes are quantiles of the values above it. This avoids an empty "< 0%" class.
- Bivariate maps use tertiles on each axis; cell = 3 · y + x.

## Geography levels and zoom

"Switch with zoom" is the default for every dataset. Zooms are for a map ${BAND_REFERENCE_WIDTH} px across; smaller screens shift every band down by \`bandShift\` (about 2 zooms on a 390 px phone), so each level covers the same ground on any screen. A pinned level draws at every zoom except below its floor, where the finest coarser level stands in.

| Level | Shown at zoom (switch with zoom) | Never below zoom (pinned) |
|---|---|---|
${Object.entries(GEO_LEVELS).map(([, v]) => `| ${v.label} | ${v.minzoom} – ${v.maxzoom === 24 ? "max" : v.maxzoom} | ${"pinFloor" in v ? v.pinFloor : "–"} |`).join("\n")}

Line widths and outlines scale with zoom (\`SIZE\`: ${Object.keys(SIZE).join(", ")}). Labels use ${LABEL.font.join(", ")} with a ${LABEL.haloWidth}px halo that matches the basemap tone. Thematic fills are inserted **below** the basemap's label layers, so place names stay readable over any fill.

## Motion and accessibility

- \`prefers-reduced-motion\` turns off map fades and UI animation.
- Map canvas has an ARIA label naming the dataset(s) and level; every control is a real button or link with a visible focus ring (\`ui.focus\`).
- Feature details are available as text (popup, detail panel, and the table view), not only as color.
`;
writeFileSync(join(root, "docs/design-system.md"), md);
console.log(`docs/design-system.md + ${ramps.length + 2} SVGs written`);
