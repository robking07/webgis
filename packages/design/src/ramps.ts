// Color ramps. Every ramp is defined by anchor stops (light → dark for sequential,
// low → mid → high for diverging) and interpolated in OKLab to the requested class
// count. `scripts/check.ts` verifies every ramp at every allowed class count under
// normal vision and simulated protan/deutan/tritan vision; the build fails on a miss.
import { formatHex, interpolate, samples } from "culori";

export type RampKind = "sequential" | "diverging" | "categorical" | "bivariate";

export interface RampDef {
  id: string;
  label: string;
  kind: RampKind;
  /** Anchor colors. Sequential: light → dark. Diverging: low → neutral → high. */
  stops: string[];
  /** Class counts this ramp is certified for. */
  minClasses: number;
  maxClasses: number;
  source: string;
}

export const RAMPS = {
  // ── Sequential ────────────────────────────────────────────────────────────
  blues: {
    id: "blues", label: "Blues", kind: "sequential", minClasses: 3, maxClasses: 7,
    stops: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"],
    source: "ColorBrewer 2.0 (Brewer, Penn State)",
  },
  ylgnbu: {
    id: "ylgnbu", label: "Yellow–Green–Blue", kind: "sequential", minClasses: 3, maxClasses: 6,
    stops: ["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#253494", "#081d58"],
    source: "ColorBrewer 2.0",
  },
  oranges: {
    id: "oranges", label: "Oranges", kind: "sequential", minClasses: 3, maxClasses: 7,
    stops: ["#fff5eb", "#fee6ce", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#a63603", "#7f2704"],
    source: "ColorBrewer 2.0",
  },
  purples: {
    id: "purples", label: "Purples", kind: "sequential", minClasses: 3, maxClasses: 7,
    stops: ["#fcfbfd", "#efedf5", "#dadaeb", "#bcbddc", "#9e9ac8", "#807dba", "#6a51a3", "#54278f", "#3f007d"],
    source: "ColorBrewer 2.0",
  },
  viridis: {
    id: "viridis", label: "Viridis", kind: "sequential", minClasses: 3, maxClasses: 7,
    stops: ["#fde725", "#b5de2b", "#6ece58", "#35b779", "#1f9e89", "#26828e", "#31688e", "#3e4989", "#482878", "#440154"],
    source: "matplotlib viridis (van der Walt & Smith)",
  },
  cividis: {
    id: "cividis", label: "Cividis", kind: "sequential", minClasses: 3, maxClasses: 7,
    stops: ["#fee838", "#e4cf5b", "#c4b56c", "#a69d75", "#8a8779", "#707173", "#575d6d", "#3b496c", "#123570", "#00224e"],
    source: "Nuñez, Anderton & Renslow 2018 (CVD-optimized)",
  },
  // ── Diverging ─────────────────────────────────────────────────────────────
  rdbu: {
    id: "rdbu", label: "Red–Blue", kind: "diverging", minClasses: 3, maxClasses: 7,
    stops: ["#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#f7f7f7", "#d1e5f0", "#92c5de", "#4393c3", "#2166ac"],
    source: "ColorBrewer 2.0",
  },
  puor: {
    id: "puor", label: "Orange–Purple", kind: "diverging", minClasses: 3, maxClasses: 7,
    stops: ["#b35806", "#e08214", "#fdb863", "#fee0b6", "#dedcd6", "#d8daeb", "#b2abd2", "#8073ac", "#542788"],
    source: "ColorBrewer 2.0",
  },
  brbg: {
    id: "brbg", label: "Brown–Teal", kind: "diverging", minClasses: 3, maxClasses: 7,
    stops: ["#8c510a", "#bf812d", "#dfc27d", "#f6e8c3", "#f5f5f5", "#c7eae5", "#80cdc1", "#35978f", "#01665e"],
    source: "ColorBrewer 2.0",
  },
  // ── Categorical (used as-is, never interpolated) ─────────────────────────
  okabeIto: {
    id: "okabeIto", label: "Okabe–Ito", kind: "categorical", minClasses: 2, maxClasses: 8,
    stops: ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#56B4E9", "#D55E00", "#F0E442", "#000000"],
    source: "Okabe & Ito 2008, Color Universal Design",
  },
  // ── Bivariate 3×3 (row-major: y low→high, x low→high) ───────────────────
  bivBlueGold: {
    id: "bivBlueGold", label: "Bivariate blue × gold", kind: "bivariate", minClasses: 9, maxClasses: 9,
    stops: [
      "#eff9f2", "#a5b9f2", "#6476ea",
      "#cfb98e", "#8c8390", "#504c88",
      "#ac7a16", "#6f4d32", "#392231",
    ],
    source: "Project-generated: bilinear OKLab grid searched to maximize the closest pair under protan/deutan/tritan simulation (min ΔE2000 16.6). Stevens' blue-pink failed protan (5.9).",
  },
} as const satisfies Record<string, RampDef>;

export type RampId = keyof typeof RAMPS;

/**
 * Trim of the light end so the first class never disappears into the basemap or reads as
 * "no data". 0.1 left ColorBrewer Purples/Blues/Oranges within ΔE 6–9 of light land (D-33, C1);
 * 0.25 puts every ramp ≥ 11 away while keeping CVD adjacency ≥ 5. Enforced in scripts/check.ts.
 */
const SEQ_START = 0.25;

/** Colors for a ramp at `n` classes, as hex strings. */
export function rampColors(id: RampId, n: number): string[] {
  const r: RampDef = RAMPS[id];
  if (n < r.minClasses || n > r.maxClasses) {
    throw new Error(`Ramp "${id}" is certified for ${r.minClasses}–${r.maxClasses} classes, not ${n}`);
  }
  if (r.kind === "categorical" || r.kind === "bivariate") return r.stops.slice(0, n);
  const interp = interpolate([...r.stops], "oklab");
  if (r.kind === "sequential") {
    return Array.from({ length: n }, (_, i) => formatHex(interp(SEQ_START + (1 - SEQ_START) * (i / (n - 1))))!);
  }
  return samples(n).map((t) => formatHex(interp(t))!);
}

/** Change-over-time maps: a diverging ramp. Falls are on the low (orange) side, rises on the
 *  high (purple) side, "no clear change" is the neutral middle. Orange–purple carries no good/bad
 *  reading (a rise in poverty and a rise in income look alike). 7 classes: three down, the
 *  middle, three up. */
export const CHANGE_RAMP: RampId = "puor";
export const CHANGE_CLASSES = 7;
