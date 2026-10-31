// Similar counties (#291, D-499): for every county, the counties most like it across every
// live county measure, worked out once here so the place page only reads a small file.
//   npm run ingest -- similar     reads data/tiles/details/*.json (run `details` first) and the
//                                 population map's county counts (residents), writes
//                                 apps/web/src/generated/similar.json
// Method, in one sentence: each county is ranked on every measure, and its matches are the
// counties whose ranks are closest overall, each topic (registry category) counted equally.
// "Alike on" lists the measures where both sit furthest from the national middle on the same
// side (both in the top or bottom quarter), one per topic.
// shortcut: the GitHub "Data run" can't commit, so it can't refresh this git file; matches go stale until someone runs `similar` after `details` and commits. Move the file to R2 if that gets missed.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { DETAILS_DIR, type DetailShard } from "./details.ts";
import { log, ROOT, TILES } from "./util.ts";

export const SIMILAR_JSON = join(ROOT, "apps/web/src/generated/similar.json");
/** Residents per county ([count, moe, …]), as the population map publishes them. Ranks, so no log needed. */
const RESIDENTS_JSON = join(TILES, "values/population_density/county.counts.json");
/** Not a registry dataset: the county's population, counted under People. */
export const RESIDENTS = "residents";
/** Measures with values for fewer counties than this share are left out (heavy missingness). */
export const MIN_COVERAGE = 0.9;
/** A pair is only compared when both have at least half the measures (Kentucky, Pennsylvania and
 *  Puerto Rico lack the CDC health measures, about a fifth of the list). */
const MIN_SHARED = 0.5;
const N = 5, ALIKE = 3, QUARTER = 0.25;

/** One match: [county geoid, distance (root-mean-square rank gap, 0 = identical), measure indexes both rank high on, both rank low on]. */
export type Match = [string, number, number[], number[]];
export interface Similar { measures: string[]; counties: Record<string, Match[]> }

/** Percentile rank (0 lowest … 1 highest, ties share the middle rank) of each value; null stays NaN. */
export function percentiles(values: (number | null)[]): Float64Array {
  const idx = values.flatMap((v, i) => (v == null ? [] : [i])).sort((a, b) => values[a]! - values[b]!);
  const out = new Float64Array(values.length).fill(NaN);
  for (let lo = 0; lo < idx.length;) {
    let hi = lo;
    while (hi + 1 < idx.length && values[idx[hi + 1]] === values[idx[lo]]) hi++;
    const p = idx.length > 1 ? (lo + hi) / 2 / (idx.length - 1) : 0.5;
    for (let k = lo; k <= hi; k++) out[idx[k]] = p;
    lo = hi + 1;
  }
  return out;
}

/** The top `n` matches for every county. `table[geoid][measure]` is the county's value (null = none);
 *  `topics[measure]` is its category, so "alike on" names at most one measure per topic. Pure, so it's unit-tested. */
export function findSimilar(table: Record<string, (number | null)[]>, measures: string[], topics: string[], n = N): Similar {
  const geoids = Object.keys(table).sort(), G = geoids.length, M = measures.length;
  const p = new Float64Array(G * M);
  for (let m = 0; m < M; m++) {
    const col = percentiles(geoids.map((g) => table[g][m]));
    for (let g = 0; g < G; g++) p[g * M + m] = col[g];
  }
  // Each topic counts equally: a measure weighs 1 / the number of measures in its topic.
  const perTopic = new Map<string, number>();
  for (const t of topics) perTopic.set(t, (perTopic.get(t) ?? 0) + 1);
  const w = topics.map((t) => 1 / perTopic.get(t)!);
  const counties: Record<string, Match[]> = {};
  for (let a = 0; a < G; a++) {
    const best: [number, number][] = []; // [distance, b], kept sorted, at most n long
    for (let b = 0; b < G; b++) {
      if (b === a) continue;
      let sum = 0, wsum = 0, k = 0;
      for (let m = 0; m < M; m++) {
        const d = p[a * M + m] - p[b * M + m];
        if (d === d) { sum += w[m] * d * d; wsum += w[m]; k++; } // NaN-safe: skips a measure either county lacks
      }
      if (k < MIN_SHARED * M) continue;
      const dist = Math.sqrt(sum / wsum);
      if (best.length === n && dist >= best[n - 1][0]) continue;
      best.splice(best.findIndex(([d]) => d > dist) >>> 0, 0, [dist, b]); // -1 >>> 0 appends
      if (best.length > n) best.pop();
    }
    counties[geoids[a]] = best.map(([dist, b]) => {
      const alike: [number, number, boolean][] = []; // [how far both sit from the middle, measure, high]
      for (let m = 0; m < M; m++) {
        const pa = p[a * M + m] - 0.5, pb = p[b * M + m] - 0.5;
        if (pa * pb > 0 && Math.min(Math.abs(pa), Math.abs(pb)) >= QUARTER) alike.push([Math.min(Math.abs(pa), Math.abs(pb)), m, pa > 0]);
      }
      const seen = new Set<string>();
      const top = alike.sort((x, y) => y[0] - x[0] || x[1] - y[1]).filter(([, m]) => !seen.has(topics[m]) && seen.add(topics[m])).slice(0, ALIKE);
      return [geoids[b], Math.round(dist * 1000) / 1000, top.filter((t) => t[2]).map((t) => t[1]), top.filter((t) => !t[2]).map((t) => t[1])];
    });
  }
  return { measures, counties };
}

/** Live county measures that are numbers (not categories) and cover enough counties. */
export function pickMeasures(entries: DatasetEntry[], coverage: Record<string, number>, counties: number): string[] {
  return entries
    .filter((d) => !d.library && d.geographyLevels.includes("county") && d.unit !== "categories" && (coverage[d.id] ?? 0) >= MIN_COVERAGE * counties)
    .map((d) => d.id).sort();
}

export function similarOut() {
  const places: Record<string, Record<string, [number | null, number | null]>> = {};
  for (const f of readdirSync(DETAILS_DIR).filter((f) => f.endsWith(".json"))) {
    const shard = JSON.parse(readFileSync(join(DETAILS_DIR, f), "utf8")) as DetailShard;
    for (const [g, d] of Object.entries(shard)) if (g.length === 5) places[g] = d.values;
  }
  const geoids = Object.keys(places);
  if (geoids.length < 3000) throw new Error(`similar: only ${geoids.length} counties in ${DETAILS_DIR}; run \`ingest details\` (or copy the live details/) first`);
  const coverage: Record<string, number> = {};
  for (const v of Object.values(places)) for (const [id, [x]] of Object.entries(v)) if (x != null) coverage[id] = (coverage[id] ?? 0) + 1;
  const entries = loadRegistry();
  const residents = JSON.parse(readFileSync(RESIDENTS_JSON, "utf8")) as Record<string, (number | null)[]>;
  for (const g of geoids) places[g] = { ...places[g], [RESIDENTS]: [residents[g]?.[0] ?? null, null] };
  const picked = pickMeasures(entries, coverage, geoids.length);
  const skipped = entries.filter((d) => d.geographyLevels.includes("county") && !picked.includes(d.id)).map((d) => d.id);
  const measures = [...picked, RESIDENTS];
  const table = Object.fromEntries(geoids.map((g) => [g, measures.map((id) => places[g][id]?.[0] ?? null)]));
  const topic = new Map<string, string>([...entries.map((d) => [d.id, d.category] as const), [RESIDENTS, "People"]]);
  const out = findSimilar(table, measures, measures.map((id) => topic.get(id)!));
  const body = JSON.stringify(out);
  writeFileSync(SIMILAR_JSON, body + "\n");
  log("similar", `${geoids.length} counties, ${measures.length} measures (skipped: ${skipped.join(", ") || "none"}), ${(body.length / 1e3).toFixed(0)} KB`);
}
