// Loads exported values (public/data/values/<id>/<level>.json) and classifies them
// with the dataset's registry symbology and the design tokens.
"use client";
import { useEffect, useState } from "react";
import { classify, classOf, LAZY_LEVELS, rampColors, RAMPS, STATIC_ONLY_LEVELS, type GeoLevel, type RampId } from "@webgis/design";
import type { Dataset } from "./registry";

export type Values = Record<string, number>;
const cache = new Map<string, Promise<Values>>();

/** Block-group files live with the tiles (R2 in production, the /tiles link locally; D-34). */
const TILES_BASE = process.env.NEXT_PUBLIC_TILES_BASE_URL || "/tiles";

export function loadValues(id: string, level: GeoLevel): Promise<Values> {
  const key = `${id}/${level}`;
  const staticOnly = STATIC_ONLY_LEVELS.has(level.replace(/\.moe$/, "") as GeoLevel);
  if (!cache.has(key)) {
    cache.set(key, fetch(staticOnly ? `${TILES_BASE}/values/${key}.json` : `/data/values/${key}.json`).then((r) => {
      if (!r.ok) throw new Error(`No ${level} data for ${id} (${r.status})`);
      return r.json();
    }).catch((e) => { cache.delete(key); throw e; }));
  }
  return cache.get(key)!;
}

export type LevelValues = Partial<Record<GeoLevel, Values>>;

/** Margins of error for a static-only level (block groups), for the details panel. */
export function loadMoes(id: string, level: GeoLevel): Promise<Values> {
  return loadValues(id, `${level}.moe` as GeoLevel);
}

/** Loads state + county immediately; tracts and block groups only once they're wanted
 *  (`want`: the fine levels about to be drawn). */
export function useDatasetValues(ds: Dataset | null, want: GeoLevel[]) {
  const wantKey = want.join();
  const [data, setData] = useState<{ id: string | null; values: LevelValues; error: string | null }>({ id: null, values: {}, error: null });
  useEffect(() => {
    if (!ds) return;
    let live = true;
    const levels = ds.geographyLevels.filter((l) => !LAZY_LEVELS.has(l) || wantKey.split(",").includes(l)) as GeoLevel[];
    for (const level of levels) {
      loadValues(ds.id, level).then(
        (v) => live && setData((d) => ({ id: ds.id, values: { ...(d.id === ds.id ? d.values : {}), [level]: v }, error: null })),
        (e: Error) => live && setData((d) => ({ ...d, id: ds.id, error: e.message })),
      );
    }
    return () => { live = false; };
  }, [ds, wantKey]);
  return data.id === ds?.id ? data : { id: null, values: {} as LevelValues, error: null };
}

export interface Classed {
  colors: string[];
  breaks: number[];
  classes: Map<string, number>;
  /** Set when the bottom class holds exactly this value (heavily skewed data). */
  minClass?: number;
}

export function classifyUnivariate(ds: Dataset, values: Values): Classed {
  const { ramp, classification, classes } = ds.symbology;
  const r = RAMPS[ramp as RampId];
  const n = Math.min(Math.max(classes, r.minClasses), r.maxClasses);
  const breaks = classify(Object.values(values), { method: classification, classes: n, breaks: ds.symbology.breaks });
  const colors = rampColors(ramp as RampId, breaks.length + 1);
  const out = new Map<string, number>();
  let min = Infinity, bottomAllMin = true;
  for (const v of Object.values(values)) if (v < min) min = v;
  for (const [g, v] of Object.entries(values)) {
    const c = classOf(v, breaks);
    if (c === 0 && v !== min) bottomAllMin = false;
    out.set(g, c);
  }
  return { colors, breaks, classes: out, minClass: breaks.length && bottomAllMin ? min : undefined };
}

export interface BivariateClassed {
  colors: string[];
  xBreaks: number[];
  yBreaks: number[];
  classes: Map<string, number>;
}

/** Tertiles on each axis; class = 3 · y + x, matching the bivariate ramp's row-major order. */
export function classifyBivariate(x: Values, y: Values): BivariateClassed {
  const shared = Object.keys(x).filter((g) => g in y);
  const xBreaks = classify(shared.map((g) => x[g]), { method: "quantile", classes: 3 });
  const yBreaks = classify(shared.map((g) => y[g]), { method: "quantile", classes: 3 });
  const classes = new Map<string, number>();
  for (const g of shared) classes.set(g, 3 * Math.min(classOf(y[g], yBreaks), 2) + Math.min(classOf(x[g], xBreaks), 2));
  return { colors: rampColors("bivBlueGold", 9), xBreaks, yBreaks, classes };
}
