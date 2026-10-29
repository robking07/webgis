// The head counts behind a rate, each place's share of the places above it, and parts-of-a-whole
// sets, for Compare places (#117 part 2b, D-258). Files and labels from D-257:
//   values/<id>/{state,county}.counts.json  { geoid: [numerator, its MOE, denominator, its MOE] }
//   values/counts/tract/<county>.json       { <map id>: { <6-digit tract>: row } }
//   values/<id>/us.json                     { value, moe, counts: row }
// relations.json (from relations.yaml) names the counts and lists the parts sets.
import RELATIONS from "@/generated/relations.json";
import { staticUrl } from "./static-files";

/** [numerator, its MOE, denominator, its MOE]; null where there is none. */
export type Counts = [number | null, number | null, number | null, number | null];

type Relations = {
  parts: Record<string, { label: string; explainer: string; members: string[]; remainder?: { id: string; label: string } }>;
  maps: Record<string, { counts?: { of: string; per?: string } }>;
};
const REL = RELATIONS as unknown as Relations;

/** Plain names for a map's counts ("people below the poverty line" of "people whose poverty status
 *  is known"), or null when the ingest publishes none for it. */
export const countsLabels = (id: string) => REL.maps[id]?.counts ?? null;
export const PARTS = Object.values(REL.parts);

// Counts are an extra: a missing or failed file shows nothing rather than breaking the page.
const cache = new Map<string, Promise<unknown>>();
function load<T>(path: string): Promise<T | null> {
  if (!cache.has(path)) cache.set(path, fetch(staticUrl(path)).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(path) as Promise<T | null>;
}

/** One place's counts for a map: a state, county or tract geoid, or "us". */
export async function placeCounts(id: string, geoid: string): Promise<Counts | null> {
  if (geoid === "us") return (await load<{ counts?: Counts }>(`values/${id}/us.json`))?.counts ?? null;
  if (geoid.length === 11) return (await load<Record<string, Record<string, Counts>>>(`values/counts/tract/${geoid.slice(0, 5)}.json`))?.[id]?.[geoid.slice(5)] ?? null;
  const level = geoid.length === 2 ? "state" : "county";
  return (await load<Record<string, Counts>>(`values/${id}/${level}.counts.json`))?.[geoid] ?? null;
}

/** The U.S. value for a map (the Census Bureau's own U.S. row, or the summed counts; D-257), or null. */
export async function usValue(id: string): Promise<number | null> {
  return (await load<{ value?: number | null }>(`values/${id}/us.json`))?.value ?? null;
}

/** The places a share is taken of: tract → county, state; county → state, U.S.; state → U.S.
 *  Puerto Rico has no U.S. share: the Census U.S. totals leave it out (D-257). */
export function parentsOf(geoid: string): string[] {
  const us = geoid.startsWith("72") ? [] : ["us"];
  if (geoid.length === 11) return [geoid.slice(0, 5), geoid.slice(0, 2)];
  if (geoid.length === 5) return [geoid.slice(0, 2), ...us];
  return us;
}

/**
 * A place's share (percent) of a parent's count, with its 90% margin of error. The place is part
 * of the parent, so this is the ACS proportion formula (ACS General Handbook, ch. 8):
 *   p = x / y;  MOE = √(MOE_x² − p²·MOE_y²) / y,  or the ratio formula √(MOE_x² + p²·MOE_y²) / y
 *   when the value under the root is negative.
 * `moe` is null when either count has no margin (full counts). Null when the parent is 0 or missing.
 */
export function shareOf(x: number | null, mx: number | null, y: number | null, my: number | null): { share: number; moe: number | null } | null {
  if (x == null || y == null || !(y > 0)) return null;
  const p = x / y;
  if (mx == null || my == null) return { share: p * 100, moe: null };
  const under = mx ** 2 - p ** 2 * my ** 2;
  return { share: p * 100, moe: (Math.sqrt(under >= 0 ? under : mx ** 2 + p ** 2 * my ** 2) / y) * 100 };
}

/**
 * Counts summed over several places (a focused MPO's counties, #292): estimates add, and margins
 * combine as √Σ MOE² (ACS General Handbook, ch. 8). A missing margin counts as 0 unless every
 * place lacks one (full counts: null). Null when a place has no row or no numerator, so a total is
 * never short a county; the denominator is null when any place lacks one.
 */
export function sumCounts(rows: Array<Counts | null | undefined>): Counts | null {
  if (!rows.length || rows.some((r) => r == null || r[0] == null)) return null;
  const rs = rows as Counts[];
  const out: Counts = [null, null, null, null];
  for (const i of [0, 2] as const) {
    if (rs.some((r) => r[i] == null)) continue;
    out[i] = rs.reduce((a, r) => a + r[i]!, 0);
    out[i + 1] = rs.some((r) => r[i + 1] != null) ? Math.sqrt(rs.reduce((a, r) => a + (r[i + 1] ?? 0) ** 2, 0)) : null;
  }
  return out;
}

/** One county in mpo/counties.json: [geoid, share of its residents inside, its 6-digit tracts inside
 *  when the boundary cuts it (#390)]. */
export type RegionCounty = [string, number] | [string, number, string[]];

/** An MPO's counties split into the ones counted (at least half their residents inside) and the ones its
 *  boundary cuts (some inside, not all). The county-only total is exact only when nothing is cut. */
export function regionCounties(list: RegionCounty[]): { counted: string[]; cut: Array<[string, number]> } {
  return { counted: list.filter(([, s]) => s >= 0.5).map(([g]) => g), cut: list.filter(([, s]) => s < 1).map(([g, s]) => [g, s]) };
}

/** The places whose counts add up to the MPO itself (#390): whole counties plus each cut county's tracts
 *  inside (11-digit geoids). Null when a cut county has no tract list (an older counties.json). */
export function regionParts(list: RegionCounty[]): string[] | null {
  const out: string[] = [];
  for (const [g, s, tracts] of list) {
    if (s === 1) out.push(g);
    else if (!tracts) return null;
    else out.push(...tracts.map((t) => g + t));
  }
  return out;
}

/** A map's total for an MPO: whole counties plus the cut counties' tracts inside ("tracts"), or, when
 *  any of those tract counts is missing (CT, maps with no tract counts), the half rule's counties
 *  ("counties"). `c` is null when neither adds up. */
export async function regionTotal(id: string, list: RegionCounty[]): Promise<{ c: Counts | null; basis: "tracts" | "counties" }> {
  const parts = regionParts(list);
  const near = parts && list.some(([, s]) => s < 1) ? sumCounts(await Promise.all(parts.map((g) => placeCounts(id, g)))) : null;
  if (near) return { c: near, basis: "tracts" };
  const { counted } = regionCounties(list);
  return { c: counted.length ? sumCounts(await Promise.all(counted.map((g) => placeCounts(id, g)))) : null, basis: "counties" };
}

/** A parts set's shares (percent) for one place, in member order, plus the remainder: 100 − Σ
 *  members (at least 0), so the bar adds to 100% (D-257's remainder rule, on the published
 *  percentages). Null when a member is missing. */
export function partsOf(values: Array<number | null | undefined>): { parts: number[]; rest: number } | null {
  if (values.some((v) => v == null || !Number.isFinite(v))) return null;
  const parts = values as number[];
  return { parts, rest: Math.max(0, 100 - parts.reduce((a, v) => a + v, 0)) };
}
