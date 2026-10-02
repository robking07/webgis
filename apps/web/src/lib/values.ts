// Loads exported values (public/data/values/<id>/<level>.json) and classifies them
// with the dataset's registry symbology and the design tokens.
"use client";
import { useEffect, useState } from "react";
import { classify, classOf, LAZY_LEVELS, rampColors, RAMPS, STATIC_ONLY_LEVELS, type GeoLevel, type RampId } from "@webgis/design";
import type { Dataset } from "./registry";

export type Values = Record<string, number>;
const cache = new Map<string, Promise<Values>>();

/** Block-group files live with the tiles (R2 in production, the /tiles link locally; D-39). */
const TILES_BASE = process.env.NEXT_PUBLIC_TILES_BASE_URL || "/tiles";

/** `stop`: a timeline stop id (D-36); omitted = the default (headline) values. */
export function loadValues(id: string, level: GeoLevel, stop?: string | null): Promise<Values> {
  const key = stop ? `${id}/${stop}/${level}` : `${id}/${level}`;
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
 *  (`want`: the fine levels about to be drawn). `stop` picks a timeline stop (null = default);
 *  `levels` limits loading to the levels that stop has. */
export function useDatasetValues(ds: Dataset | null, want: GeoLevel[], stop: string | null = null, levels?: GeoLevel[]) {
  const wantKey = want.join(",");
  const key = ds ? `${ds.id}@${stop ?? ""}` : null;
  const [data, setData] = useState<{ key: string | null; values: LevelValues; error: string | null }>({ key: null, values: {}, error: null });
  const levelKey = (levels ?? ds?.geographyLevels ?? []).join(",");
  useEffect(() => {
    if (!ds || !key) return;
    let live = true;
    const wanted = wantKey.split(",");
    const load = (levelKey ? levelKey.split(",") : []).filter((l) => !LAZY_LEVELS.has(l as GeoLevel) || wanted.includes(l)) as GeoLevel[];
    for (const level of load) {
      loadValues(ds.id, level, stop).then(
        (v) => live && setData((d) => ({ key, values: { ...(d.key === key ? d.values : {}), [level]: v }, error: null })),
        (e: Error) => live && setData((d) => ({ ...d, key, error: e.message })),
      );
    }
    return () => { live = false; };
  }, [ds, key, stop, levelKey, wantKey]);
  return data.key === key && key ? data : { key: null, values: {} as LevelValues, error: null };
}

export interface Classed {
  colors: string[];
  breaks: number[];
  classes: Map<string, number>;
  /** Set when the bottom class holds exactly this value (heavily skewed data). */
  minClass?: number;
}

/** `breaksFrom`: classify with breaks computed from these values instead (the default view's),
 *  so stepping through time shows change rather than re-ranking each year (D-36). */
export function classifyUnivariate(ds: Dataset, values: Values, breaksFrom?: Values): Classed {
  const { ramp, classification, classes } = ds.symbology;
  const r = RAMPS[ramp as RampId];
  const n = Math.min(Math.max(classes, r.minClasses), r.maxClasses);
  const breaks = classify(Object.values(breaksFrom ?? values), { method: classification, classes: n, breaks: ds.symbology.breaks });
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

// Classification results are cached per loaded values object (D-114): each level is
// classified once, and its result keeps the same identity across renders, so the map only
// repaints a level when that level's data actually changes.
const uniCache = new WeakMap<Values, Map<string, WeakMap<Values, Classed>>>();
const biCache = new WeakMap<Values, WeakMap<Values, BivariateClassed>>();
const blockCache = new WeakMap<Classed, Map<string, Classed & { field: string }>>();

export function classifyUnivariateCached(ds: Dataset, values: Values, breaksFrom?: Values): Classed {
  let byDs = uniCache.get(values);
  if (!byDs) uniCache.set(values, (byDs = new Map()));
  let byBase = byDs.get(ds.id);
  if (!byBase) byDs.set(ds.id, (byBase = new WeakMap()));
  const key = breaksFrom ?? values;
  let c = byBase.get(key);
  if (!c) byBase.set(key, (c = classifyUnivariate(ds, values, breaksFrom)));
  return c;
}

export function classifyBivariateCached(x: Values, y: Values): BivariateClassed {
  let byY = biCache.get(x);
  if (!byY) biCache.set(x, (byY = new WeakMap()));
  let c = byY.get(y);
  if (!c) byY.set(y, (c = classifyBivariate(x, y)));
  return c;
}

/** Blocks reuse the block-group classes, colored from a tile property (`field`). */
export function blockPaintFrom(bg: Classed, field: string): Classed & { field: string } {
  let byField = blockCache.get(bg);
  if (!byField) blockCache.set(bg, (byField = new Map()));
  let c = byField.get(field);
  if (!c) byField.set(field, (c = { colors: bg.colors, breaks: bg.breaks, classes: new Map(), field }));
  return c;
}
