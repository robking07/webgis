// Accessibility gate for the design tokens. Exits 1 on any violation.
//
// For every ramp at every certified class count, under normal vision and simulated
// protanopia, deuteranopia and tritanopia (Machado et al. 2009, full severity):
//   - sequential: adjacent classes ≥ MIN_ADJ ΔE2000 apart, lightness strictly monotonic
//   - diverging:  adjacent classes ≥ MIN_ADJ apart, lightness rises to the midpoint then falls
//   - categorical: every pair ≥ MIN_CAT apart
//   - bivariate:   every pair ≥ MIN_BIV apart
// Plus WCAG contrast for every pair in CONTRAST_RULES, in both themes, and the top class of
// every sequential ramp drawn as a feature line against focus land, in both themes.
import {
  differenceCiede2000, filterDeficiencyDeuter, filterDeficiencyProt, filterDeficiencyTrit,
  formatHex, interpolate, oklab, wcagContrast,
} from "culori";
import { CHANGE_CLASSES, CHANGE_RAMP, RAMPS, rampColors, type RampDef, type RampId } from "../src/ramps.ts";
import { CONTRAST_RULES, FOCUS_DIM, GLASS_ALPHA, HATCH, THEMES, themeColor } from "../src/themes.ts";
import { featureLineColors } from "../src/style.ts";

export const THRESHOLDS = { MIN_ADJ: 5, MIN_CAT: 10, MIN_BIV: 8 };
/** WCAG non-text contrast for the top feature-line class against focus land. */
const MIN_LINE_TOP = 3;
/** ΔE2000 every area class keeps from focus land and from the no-data fill, so no class reads as empty. */
const MIN_FROM_LAND = 10;
/** ΔE2000 between land and water, so water reads as water without the shoreline. */
const MIN_LAND_WATER = 8;

const de = differenceCiede2000();
const VISION = {
  normal: (c: string) => c,
  protan: (c: string) => formatHex(filterDeficiencyProt(1)(c as never))!,
  deutan: (c: string) => formatHex(filterDeficiencyDeuter(1)(c as never))!,
  tritan: (c: string) => formatHex(filterDeficiencyTrit(1)(c as never))!,
};

const isMain = import.meta.url === `file://${process.argv[1]}`;
const failures: string[] = [];
const report: Array<{ ramp: string; n: number; vision: string; min: number }> = [];
const L = (c: string) => oklab(c)!.l;

for (const [id, r] of Object.entries(RAMPS) as Array<[RampId, RampDef]>) {
  for (let n = r.minClasses; n <= r.maxClasses; n++) {
    const base = rampColors(id, n);
    for (const [vision, sim] of Object.entries(VISION)) {
      const cs = base.map(sim);
      let min = Infinity;
      if (r.kind === "sequential" || r.kind === "diverging") {
        for (let i = 1; i < n; i++) min = Math.min(min, de(cs[i - 1], cs[i]));
        if (min < THRESHOLDS.MIN_ADJ) failures.push(`${id} n=${n} ${vision}: adjacent ΔE ${min.toFixed(1)} < ${THRESHOLDS.MIN_ADJ}`);
        const ls = cs.map(L);
        if (r.kind === "sequential") {
          if (!ls.every((l, i) => i === 0 || l < ls[i - 1])) failures.push(`${id} n=${n} ${vision}: lightness not monotonic`);
        } else {
          // Rising through floor(mid), falling after ceil(mid); for even n the two
          // central classes straddle the neutral point and either may be lighter.
          const mid = (n - 1) / 2;
          const ok = ls.every((l, i) =>
            i === 0 || (i <= Math.floor(mid) ? l >= ls[i - 1] - 1e-3 : i > Math.ceil(mid) ? l <= ls[i - 1] + 1e-3 : true));
          if (!ok) failures.push(`${id} n=${n} ${vision}: diverging lightness not peaked at midpoint`);
        }
      } else {
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) min = Math.min(min, de(cs[i], cs[j]));
        const t = r.kind === "categorical" ? THRESHOLDS.MIN_CAT : THRESHOLDS.MIN_BIV;
        if (min < t) failures.push(`${id} n=${n} ${vision}: closest pair ΔE ${min.toFixed(1)} < ${t}`);
      }
      report.push({ ramp: id, n, vision, min: +min.toFixed(1) });
    }
  }
}

for (const theme of Object.values(THEMES)) {
  for (const [fg, bg, ratio, purpose] of CONTRAST_RULES) {
    const c = wcagContrast(themeColor(theme, fg), themeColor(theme, bg));
    if (c < ratio) failures.push(`theme ${theme.name}: ${fg} on ${bg} (${purpose}) contrast ${c.toFixed(2)} < ${ratio}`);
  }
}

// Frosted glass (the desktop filters sidebar, issue #34): the panel color at GLASS_ALPHA over
// whatever map is behind it. Its text and secondary text must keep 4.5:1 over the darkest and
// lightest thing the map can draw there: black, white, and the ends of every ramp.
let glassCases = 0;
for (const theme of Object.values(THEMES)) {
  const behind = new Set<string>(["#000000", "#ffffff", ...Object.values(theme.map)]);
  for (const [id, r] of Object.entries(RAMPS) as Array<[RampId, RampDef]>) {
    const cs = rampColors(id, r.maxClasses);
    behind.add(cs[0]); behind.add(cs[cs.length - 1]);
  }
  for (const b of behind) {
    // sRGB alpha compositing, as the browser draws it (blur only averages what's behind).
    const panel = formatHex(interpolate([b, theme.ui.surface], "rgb")(GLASS_ALPHA[theme.name]))!;
    for (const [fg, purpose] of [["text", "glass sidebar text"], ["textMuted", "glass sidebar secondary text"]] as const) {
      glassCases++;
      const c = wcagContrast(theme.ui[fg], panel);
      if (c < 4.5) failures.push(`theme ${theme.name}: ${fg} on glass over ${b} (${purpose}) contrast ${c.toFixed(2)} < 4.5`);
    }
  }
}

// Area fills: every class of every sequential ramp stays clear of focus land, of land and water
// outside the U.S. (where the data meets the border and the coast) and of the no-data fill, in both themes (a pale first
// class used to read as "no data"). Diverging ramps are exempt:
// their neutral middle is near-white by design; give a diverging map a distinct no-data treatment.
let landCases = 0;
for (const [id, r] of Object.entries(RAMPS) as Array<[RampId, RampDef]>) {
  if (r.kind !== "sequential") continue;
  for (let n = r.minClasses; n <= r.maxClasses; n++) for (const theme of Object.values(THEMES)) {
    for (const [i, c] of rampColors(id, n).entries()) {
      landCases++;
      for (const [what, bg] of [["land", theme.map.focusLand], ["outside land", theme.map.land], ["water", theme.map.water], ["no-data", theme.map.noData]] as const) {
        const d = de(c, bg);
        if (d < MIN_FROM_LAND) failures.push(`${id} n=${n} class ${i + 1} theme ${theme.name}: ΔE ${d.toFixed(1)} from ${what} < ${MIN_FROM_LAND}`);
      }
    }
  }
}
// Land and water outside the U.S. read as land and water (issue #201), in both themes.
for (const theme of Object.values(THEMES)) {
  landCases++;
  const d = de(theme.map.land, theme.map.water);
  if (d < MIN_LAND_WATER) failures.push(`theme ${theme.name}: land vs water ΔE ${d.toFixed(1)} < ${MIN_LAND_WATER}`);
}
// The change ramp (diverging, so exempt above) still keeps every class, its near-white "no clear
// change" middle included, clear of the change map's no-data fill: a steady area must never read as missing.
for (const theme of Object.values(THEMES)) {
  for (const [i, c] of rampColors(CHANGE_RAMP, CHANGE_CLASSES).entries()) {
    for (const [vision, sim] of Object.entries(VISION)) {
      landCases++;
      const d = de(sim(c), sim(theme.map.noDataChange));
      if (d < MIN_FROM_LAND) failures.push(`change ramp ${CHANGE_RAMP} class ${i + 1} theme ${theme.name} ${vision}: ΔE ${d.toFixed(1)} from change no-data < ${MIN_FROM_LAND}`);
      // "No clear change" (the middle) is painted: it must not read as unpainted U.S. land (#474).
      if (i === (CHANGE_CLASSES - 1) / 2) {
        const dl = de(sim(c), sim(theme.map.focusLand));
        if (dl < MIN_FROM_LAND) failures.push(`change ramp no-clear-change theme ${theme.name} ${vision}: ΔE ${dl.toFixed(1)} from U.S. land < ${MIN_FROM_LAND}`);
      }
    }
  }
}

// Feature lines: the highest class (the busiest roads) must stand out from the land it is drawn
// on, in both themes, as drawn (dark themes reverse the ramp; see featureLineColors).
let lineCases = 0;
for (const [id, r] of Object.entries(RAMPS) as Array<[RampId, RampDef]>) {
  if (r.kind !== "sequential") continue;
  for (let n = r.minClasses; n <= r.maxClasses; n++) for (const theme of Object.values(THEMES)) {
    const drawn = featureLineColors(rampColors(id, n), theme.name);
    const c = wcagContrast(drawn[n - 1], theme.map.focusLand);
    lineCases++;
    if (c < MIN_LINE_TOP) failures.push(`${id} n=${n} theme ${theme.name}: top line class on land contrast ${c.toFixed(2)} < ${MIN_LINE_TOP}`);
  }
}

// Reliability hatching (D-222): over every class of every area ramp (and no-data), in both themes,
// at least one of the paired stripes, composited at HATCH.opacity, must stand out from the fill.
let hatchCases = 0;
for (const theme of Object.values(THEMES)) {
  const a = HATCH.opacity[theme.name];
  const fills = new Set<string>([theme.map.noData, theme.map.noDataChange]);
  for (const [id, r] of Object.entries(RAMPS) as Array<[RampId, RampDef]>) {
    if (r.kind === "categorical") continue;
    for (let n = r.minClasses; n <= r.maxClasses; n++) for (const c of rampColors(id, n)) fills.add(c);
  }
  for (const f of fills) {
    hatchCases++;
    const best = Math.max(...[theme.map.hatchDark, theme.map.hatchLight].map((s) => wcagContrast(formatHex(interpolate([f, s], "rgb")(a))!, f)));
    if (best < HATCH.minContrast) failures.push(`theme ${theme.name}: hatch over ${f} contrast ${best.toFixed(2)} < ${HATCH.minContrast}`);
  }
}

// Drill-down dimming (issue #203): the wash sets each area ramp back visibly on average (a class
// already near the wash color can't change much; the focused place's selection outline marks its
// edge), and the dimmed ramp keeps its ends apart (the rest of the map stays readable), in both themes.
let dimCases = 0;
for (const theme of Object.values(THEMES)) {
  const dim = (c: string) => formatHex(interpolate([c, theme.map.focusDim], "rgb")(FOCUS_DIM.opacity[theme.name]))!;
  for (const [id, r] of Object.entries(RAMPS) as Array<[RampId, RampDef]>) {
    if (r.kind === "categorical") continue;
    for (let n = r.minClasses; n <= r.maxClasses; n++) {
      const cs = rampColors(id, n);
      dimCases++;
      const mean = cs.reduce((a, c) => a + de(c, dim(c)), 0) / n;
      if (mean < FOCUS_DIM.minMeanShift) failures.push(`${id} n=${n} theme ${theme.name}: the dim wash shifts classes only ΔE ${mean.toFixed(1)} on average < ${FOCUS_DIM.minMeanShift}`);
      if (r.kind !== "sequential") continue;
      const spread = de(dim(cs[0]), dim(cs[n - 1]));
      if (spread < FOCUS_DIM.minSpread) failures.push(`${id} n=${n} theme ${theme.name}: dimmed ends ΔE ${spread.toFixed(1)} < ${FOCUS_DIM.minSpread}`);
    }
  }
}

if (isMain && process.argv.includes("--verbose")) console.table(report);
if (isMain && failures.length) {
  console.error(`✗ design check failed (${failures.length}):\n  ` + failures.join("\n  "));
  process.exit(1);
}
if (isMain) console.log(`✓ design check passed: ${Object.keys(RAMPS).length} ramps, ${report.length} ramp/class/vision cases, ${CONTRAST_RULES.length * 2} contrast pairs, ${glassCases} glass-over-map cases, ${landCases} class-vs-land cases, ${lineCases} line-on-land cases, ${hatchCases} hatch-over-fill cases, ${dimCases} dimmed-class cases`);
