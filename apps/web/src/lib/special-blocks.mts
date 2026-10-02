// Inline elements in a Special's body (D-120): focus maps, charts and tables, written as fenced
// blocks (```map, ```chart, ```table) with YAML inside. Parsed and computed before the build (scripts/prepare.mts) from the
// exported county values (public/data/values/<id>/county.json), so every number on the page comes
// from Mapwich's own data. Any mistake fails the build with a message naming the file.
// Format: content/specials/README.md.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { Unit } from "@webgis/design";
import type { DatasetEntry } from "@webgis/registry";
import { timelineStops } from "@webgis/registry/timeline";

/** What the parser needs from outside: the registry and where the app's exported values live. */
export interface BlockContext { byId: Map<string, DatasetEntry>; appDir: string }

type Fail = (msg: string) => never;

/** A dataset as used in a chart or table: `id`, or `id@stop` for a timeline stop (e.g. `pct_work_from_home@2019`). */
export interface Ref {
  id: string;
  stop: string | null;
  title: string;
  unit: Unit;
  /** The period of a non-default stop ("2015–2019"); null for the dataset's headline values. */
  period: string | null;
}

export interface FocusMap {
  kind: "map";
  datasets: [string] | [string, string];
  at: { lon: number; lat: number; zoom: number };
  level: "county" | "tract";
  /** Inline Markdown, rendered. */
  caption: string;
}

/** Average (or median) of `y` for counties grouped by `x` into equal-count groups (deciles, quintiles…). */
export interface BinsChart {
  kind: "bins";
  title: string;
  caption: string | null;
  stat: "mean" | "median";
  x: Ref;
  y: Ref;
  /** Counties with both values. */
  n: number;
  rows: Array<{ lo: number; hi: number; n: number; value: number }>;
}

/** Spearman rank correlation of each row dataset with each column dataset, across counties. */
export interface CorrelationTable {
  kind: "correlations";
  title: string;
  caption: string | null;
  with: Ref[];
  rows: Array<{ ref: Ref; cells: Array<{ rho: number; n: number } | null> }>;
}

/** Named counties (or the top / bottom N by one dataset), with a column per dataset. */
export interface CountyTable {
  kind: "counties";
  title: string;
  caption: string | null;
  columns: Ref[];
  rows: Array<{ geoid: string; name: string; values: Array<number | null> }>;
}

export type Block = FocusMap | BinsChart | CorrelationTable | CountyTable;

let ctx: BlockContext | null = null;
/** Call once before parsing. */
export function setBlockContext(c: BlockContext) { ctx = c; valueCache.clear(); names = null; }
const byId = () => ctx!.byId;
const valuesDir = () => join(ctx!.appDir, "public/data/values");

const valueCache = new Map<string, Record<string, number>>();
let names: Record<string, string> | null = null;

function countyValues(ref: Ref): Record<string, number> {
  const key = `${ref.id}@${ref.stop ?? ""}`;
  if (!valueCache.has(key)) {
    const file = join(valuesDir(), ref.id, ...(ref.stop ? [ref.stop] : []), "county.json");
    valueCache.set(key, JSON.parse(readFileSync(file, "utf8")));
  }
  return valueCache.get(key)!;
}

function countyName(geoid: string) {
  names ??= JSON.parse(readFileSync(join(ctx!.appDir, "public/data/geo/names.json"), "utf8")) as Record<string, string>;
  return names[geoid];
}

function ref(raw: unknown, fail: Fail, what: string): Ref {
  if (typeof raw !== "string") fail(`${what} must be a dataset id`);
  const [id, stop = null] = raw.split("@");
  const ds = byId().get(id);
  if (!ds) fail(`${what}: unknown dataset "${id}" (see data/registry/datasets/)`);
  if (!ds.geographyLevels.includes("county")) fail(`${what}: "${id}" has no county values`);
  let period: string | null = null;
  if (stop) {
    const s = timelineStops(ds).find((t) => t.id === stop);
    if (!s) fail(`${what}: "${id}" has no timeline stop "${stop}"`);
    if (!s.isDefault) period = s.label;
  }
  const r: Ref = { id, stop: period ? stop : null, title: ds.title, unit: ds.unit as Unit, period };
  if (!existsSync(join(valuesDir(), id, ...(r.stop ? [r.stop] : []), "county.json"))) fail(`${what}: no exported county values for "${raw}"`);
  return r;
}

const refs = (raw: unknown, fail: Fail, what: string, min = 1) => {
  if (!Array.isArray(raw) || raw.length < min) fail(`${what} must list ${min === 1 ? "at least one dataset id" : `at least ${min} dataset ids`}`);
  return raw.map((r, i) => ref(r, fail, `${what}[${i + 1}]`));
};

// ── Statistics (same method as the Odd Pairings in data/ingest/src/insights.ts) ─────────────
function pearson(a: number[], b: number[]) {
  const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db; }
  return sab / Math.sqrt(saa * sbb);
}
function ranks(a: number[]) {
  const idx = a.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
  const r = new Array<number>(a.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}
function spearman(x: Record<string, number>, y: Record<string, number>) {
  const g = Object.keys(x).filter((k) => k in y);
  return { rho: pearson(ranks(g.map((k) => x[k])), ranks(g.map((k) => y[k]))), n: g.length };
}
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// ── Parsing ──────────────────────────────────────────────────────────────────────────────
function checkKeys(o: Record<string, unknown>, allowed: string[], fail: Fail) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(`unknown field "${k}" (allowed: ${allowed.join(", ")})`);
}
const text = (o: Record<string, unknown>, k: string, fail: Fail, required: boolean) => {
  const v = o[k];
  if (v == null || v === "") { if (required) fail(`"${k}" is required`); return null; }
  if (typeof v !== "string") fail(`"${k}" must be text`);
  return v.trim();
};

export function parseBlock(lang: string, yaml: string, fail: Fail, inline: (md: string) => string): Block {
  let o: Record<string, unknown>;
  try { o = (parseYaml(yaml) ?? {}) as Record<string, unknown>; } catch (e) { fail(`can't read the YAML: ${(e as Error).message}`); }
  if (typeof o !== "object" || Array.isArray(o)) fail("the block must be YAML fields (name: value)");
  const caption = (required: boolean) => { const c = text(o, "caption", fail, required); return c ? inline(c) : null; };

  if (lang === "map") {
    checkKeys(o, ["datasets", "at", "level", "caption"], fail);
    const ds = o.datasets;
    if (!Array.isArray(ds) || ds.length < 1 || ds.length > 2) fail(`"datasets" must list one or two dataset ids`);
    for (const id of ds) {
      const d = byId().get(String(id));
      if (!d) fail(`unknown dataset "${id}" (see data/registry/datasets/)`);
      if (!d.geographyLevels.includes("county")) fail(`"${id}" has no county values`);
    }
    const a = o.at;
    if (!Array.isArray(a) || a.length !== 3 || !a.every((n) => typeof n === "number")) fail(`"at" must be [longitude, latitude, zoom]`);
    const [lon, lat, zoom] = a as number[];
    if (lon < -180 || lon > -60 || lat < 15 || lat > 72) fail(`"at" ${JSON.stringify(a)} is outside the U.S.; it is [longitude, latitude, zoom] (longitude first, negative)`);
    if (zoom < 2 || zoom > 14) fail(`"at" zoom ${zoom} must be between 2 and 14`);
    const level = (o.level ?? "county") as string;
    if (level !== "county" && level !== "tract") fail(`"level" must be county or tract`);
    if (level === "tract") {
      if (ds.length !== 1) fail(`a tract map shows one dataset (a two-dataset map needs a level both share: county)`);
      if (!byId().get(String(ds[0]))!.geographyLevels.includes("tract")) fail(`"${ds[0]}" has no tract values`);
    }
    return { kind: "map", datasets: ds.map(String) as FocusMap["datasets"], at: { lon, lat, zoom }, level, caption: caption(true)! };
  }

  const title = text(o, "title", fail, true)!;
  const type = text(o, "type", fail, true);

  if (lang === "chart") {
    if (type !== "bins") fail(`chart "type" must be bins`);
    checkKeys(o, ["type", "title", "caption", "x", "y", "groups", "stat"], fail);
    const x = ref(o.x, fail, `"x"`), y = ref(o.y, fail, `"y"`);
    const groups = o.groups ?? 10;
    if (typeof groups !== "number" || !Number.isInteger(groups) || groups < 3 || groups > 20) fail(`"groups" must be a whole number from 3 to 20 (10 = deciles, 5 = quintiles)`);
    const stat = (o.stat ?? "mean") as string;
    if (stat !== "mean" && stat !== "median") fail(`"stat" must be mean or median`);
    const xv = countyValues(x), yv = countyValues(y);
    // Equal-count groups by x (ties broken by county id so the split is reproducible).
    const g = Object.keys(xv).filter((k) => k in yv).sort((a, b) => xv[a] - xv[b] || a.localeCompare(b));
    const rows = Array.from({ length: groups }, (_, i) => {
      const part = g.slice(Math.floor((i * g.length) / groups), Math.floor(((i + 1) * g.length) / groups));
      const ys = part.map((k) => yv[k]);
      return { lo: xv[part[0]], hi: xv[part[part.length - 1]], n: part.length, value: stat === "mean" ? ys.reduce((s, v) => s + v, 0) / ys.length : median(ys) };
    });
    return { kind: "bins", title, caption: caption(false), stat, x, y, n: g.length, rows };
  }

  if (lang === "table") {
    if (type === "correlations") {
      checkKeys(o, ["type", "title", "caption", "rows", "with"], fail);
      const w = refs(o.with, fail, `"with"`), rs = refs(o.rows, fail, `"rows"`);
      if (w.length > 3) fail(`"with" takes at most three datasets (columns)`);
      const rows = rs.map((r) => ({
        ref: r,
        cells: w.map((c) => (c.id === r.id && c.stop === r.stop ? null : spearman(countyValues(r), countyValues(c)))),
      }));
      return { kind: "correlations", title, caption: caption(false), with: w, rows };
    }
    if (type === "counties" || type === "rank") {
      const columns = refs(o.columns, fail, `"columns"`);
      if (columns.length > 4) fail(`"columns" takes at most four datasets`);
      let geoids: string[];
      if (type === "counties") {
        checkKeys(o, ["type", "title", "caption", "counties", "columns"], fail);
        if (!Array.isArray(o.counties) || !o.counties.length || o.counties.length > 25) fail(`"counties" must list 1 to 25 county FIPS codes (quoted, e.g. "51013")`);
        geoids = o.counties.map((c) => String(c).padStart(5, "0"));
        for (const g of geoids) if (!/^\d{5}$/.test(g) || !countyName(g)) fail(`"counties": "${g}" is not a county FIPS code`);
      } else {
        checkKeys(o, ["type", "title", "caption", "by", "order", "n", "columns"], fail);
        const by = ref(o.by, fail, `"by"`);
        const order = o.order ?? "top";
        if (order !== "top" && order !== "bottom") fail(`"order" must be top or bottom`);
        const n = o.n ?? 10;
        if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 25) fail(`"n" must be a whole number from 1 to 25`);
        const bv = countyValues(by);
        geoids = Object.keys(bv).sort((a, b) => (order === "top" ? bv[b] - bv[a] : bv[a] - bv[b]) || a.localeCompare(b)).slice(0, n);
      }
      const rows = geoids.map((g) => ({ geoid: g, name: countyName(g), values: columns.map((c) => countyValues(c)[g] ?? null) }));
      return { kind: "counties", title, caption: caption(false), columns, rows };
    }
    fail(`table "type" must be correlations, counties or rank`);
  }
  fail(`unknown block type "${lang}"`);
}

/** Dataset ids a block draws on (for the sources list). */
export function blockDatasets(b: Block): string[] {
  switch (b.kind) {
    case "map": return [...b.datasets];
    case "bins": return [b.x.id, b.y.id];
    case "correlations": return [...b.rows.map((r) => r.ref.id), ...b.with.map((r) => r.id)];
    case "counties": return b.columns.map((c) => c.id);
  }
}

/** Words a reader reads in a block (title and caption), for the read time. */
export function blockWords(b: Block): number {
  const strip = (s: string | null) => (s ?? "").replace(/<[^>]+>/g, " ");
  const t = b.kind === "map" ? strip(b.caption) : `${b.title} ${strip(b.caption)}`;
  return t.split(/\s+/).filter(Boolean).length;
}
