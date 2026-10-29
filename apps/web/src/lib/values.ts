// Loads exported values (values/<id>/[<stop>/]<level>.json beside the tiles, S2) and classifies them
// with the dataset's registry symbology and the design tokens.
"use client";
import { useEffect, useState } from "react";
import { classify, classifyValues, classOf, LAZY_LEVELS, rampColors, TILE_VALUE_LEVELS, type GeoLevel, type PackedClasses } from "@webgis/design";
import { DATASET_BY_ID, type Dataset } from "./registry";
// Every level's file lives with the tiles (R2 in production, the /tiles link locally; D-124, S2).
import { reportError } from "./report-error";
import { fetchRetry, staticUrl } from "./static-files";

export type Values = Record<string, number>;
const cache = new Map<string, Promise<Values>>();


/** `stop`: a timeline stop id (D-36); omitted = the default (headline) values. */
export function loadValues(id: string, level: GeoLevel, stop?: string | null): Promise<Values> {
  const key = stop ? `${id}/${stop}/${level}` : `${id}/${level}`;
  if (!cache.has(key)) {
    const url = staticUrl(`values/${key}.json`);
    // Tracts and block groups (85k and 240k values) are fetched, parsed and classified in a
    // worker, so the map doesn't stall when they first load (D-277).
    const onMain = () => fetchRetry(url).then((r) => (r.ok ? r.json() : r.status));
    // A worker that fails (its script missing after a deploy, a network error) falls back to the main thread.
    const loaded = LAZY_LEVELS.has(level) && typeof Worker !== "undefined"
      ? loadInWorker(url, stop ? undefined : DATASET_BY_ID.get(id), level).catch(onMain)
      : onMain();
    cache.set(key, loaded.then((v) => {
      if (typeof v === "number") throw new Error(`No ${level} data for ${id} (${v})`);
      return v;
    }).catch((e) => { cache.delete(key); throw e; }));
  }
  return cache.get(key)!;
}

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (m: WorkerReply) => void>();

/** Resolves to the values (with the default classification cached for `ds`), or the HTTP status. */
async function loadInWorker(url: string, ds: Dataset | undefined, level: GeoLevel): Promise<Values | number> {
  // Block groups are classed with the tract breaks (issue #325): the same values object the map
  // classifies tracts from, so the classification seeded below is the one the map asks for.
  const tracts = ds && level === "block_group" && ds.geographyLevels.includes("tract") ? await loadValues(ds.id, "tract") : undefined;
  const breaks = tracts && classifyUnivariateCached(ds!, tracts).breaks;
  if (!worker) {
    worker = new Worker(new URL("./values.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<WorkerReply>) => { pending.get(e.data.id)?.(e.data); pending.delete(e.data.id); };
    // The worker didn't load or crashed: fail every waiting request (it never replies) and start fresh next time.
    worker.onerror = () => {
      for (const [id, done] of pending) done({ id, error: "values worker failed" });
      pending.clear();
      worker = null;
    };
  }
  const id = nextId++;
  const reply = await new Promise<WorkerReply>((resolve) => {
    pending.set(id, resolve);
    worker!.postMessage({ id, url: new URL(url, location.href).href, symbology: ds?.symbology, breaks } satisfies WorkerRequest);
  });
  if ("error" in reply) throw new Error(reply.error);
  if ("status" in reply) return reply.status;
  const keys = reply.keys ? reply.keys.split(",") : [];
  const values: Values = {};
  const classes = new Map<string, number>();
  // Built in slices with a yield between them: one 240k-entry pass blocks for ~100 ms.
  for (let i = 0; i < keys.length; i++) {
    values[keys[i]] = reply.vals[i];
    if (reply.classed) classes.set(keys[i], reply.classed.cls[i]);
    if (i % 20000 === 19999) await new Promise((r) => setTimeout(r));
  }
  const c = reply.classed;
  if (ds && c) seedClassified(ds, values, { colors: c.colors, breaks: c.breaks, minClass: c.minClass, packed: c.packed, classes }, tracts);
  return values;
}

export type WorkerRequest = { id: number; url: string; symbology?: Dataset["symbology"]; breaks?: number[] };
export type WorkerReply = { id: number } & (
  | { error: string }
  | { status: number }
  | { keys: string; vals: Float64Array; classed?: ReturnType<typeof classifyValues> & { packed: PackedClasses } }
);

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
    // Blocks carry their values in the tiles (D-124): there is no values file to fetch.
    const load = (levelKey ? levelKey.split(",") : []).filter((l) => !TILE_VALUE_LEVELS.has(l as GeoLevel) && (!LAZY_LEVELS.has(l as GeoLevel) || wanted.includes(l))) as GeoLevel[];
    for (const level of load) {
      loadValues(ds.id, level, stop).then(
        (v) => live && setData((d) => ({ key, values: { ...(d.key === key ? d.values : {}), [level]: v }, error: null })),
        (e: Error) => {
          reportError(e); // the technical detail goes to monitoring; the visitor gets plain words
          if (live) setData((d) => ({ key, values: d.key === key ? d.values : {}, error: "This map didn't load. Try again in a minute." }));
        },
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
  /** `classes` packed for the per-state map layers, when the values worker classified them. */
  packed?: PackedClasses;
}

/** `breaksFrom`: classify with breaks computed from these values instead (the default view's),
 *  so stepping through time shows change rather than re-ranking each year (D-36). */
export function classifyUnivariate(ds: Dataset, values: Values, breaksFrom?: Values): Classed {
  // One Object.keys pass: Object.values/entries on a 240k-key object cost ~150 ms each.
  const keys = Object.keys(values);
  const { cls, ...rest } = classifyValues(ds.symbology, keys.map((k) => values[k]), breaksFrom && Object.values(breaksFrom));
  const classes = new Map<string, number>();
  keys.forEach((k, i) => classes.set(k, cls[i]));
  return { ...rest, classes };
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

/** Caches a classification the values worker already made (default view; `breaksFrom` = the tracts
 *  for block groups). */
function seedClassified(ds: Dataset, values: Values, c: Classed, breaksFrom?: Values) {
  uniCache.set(values, new Map([[ds.id, new WeakMap([[breaksFrom ?? values, c]])]]));
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
