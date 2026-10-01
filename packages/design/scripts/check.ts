// Accessibility gate for the design tokens. Exits 1 on any violation.
//
// For every ramp at every certified class count, under normal vision and simulated
// protanopia, deuteranopia and tritanopia (Machado et al. 2009, full severity):
//   - sequential: adjacent classes ≥ MIN_ADJ ΔE2000 apart, lightness strictly monotonic
//   - diverging:  adjacent classes ≥ MIN_ADJ apart, lightness rises to the midpoint then falls
//   - categorical: every pair ≥ MIN_CAT apart
//   - bivariate:   every pair ≥ MIN_BIV apart
// Plus WCAG contrast for every pair in CONTRAST_RULES, in both themes.
import {
  differenceCiede2000, filterDeficiencyDeuter, filterDeficiencyProt, filterDeficiencyTrit,
  formatHex, oklab, wcagContrast,
} from "culori";
import { RAMPS, rampColors, type RampDef, type RampId } from "../src/ramps.ts";
import { CONTRAST_RULES, THEMES, themeColor } from "../src/themes.ts";

export const THRESHOLDS = { MIN_ADJ: 5, MIN_CAT: 10, MIN_BIV: 8 };

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

if (isMain && process.argv.includes("--verbose")) console.table(report);
if (isMain && failures.length) {
  console.error(`✗ design check failed (${failures.length}):\n  ` + failures.join("\n  "));
  process.exit(1);
}
if (isMain) console.log(`✓ design check passed: ${Object.keys(RAMPS).length} ramps, ${report.length} ramp/class/vision cases, ${CONTRAST_RULES.length * 2} contrast pairs`);
