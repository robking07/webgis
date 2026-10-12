// How maps relate to each other (#156, related-datasets task 1): `relations.yaml` lists every
// registry map with its topic group and the counts behind it, the parts-of-a-whole sets (maps whose
// shares add up to 100% of one total) and hand-picked links between maps. Compare places (#117)
// reads it through the generated relations.json. `registry:validate` fails when a registry map has
// no entry, so a new dataset can't skip it.
import { z } from "zod";
import type { DatasetEntry } from "./schema.ts";

const Id = z.string().regex(/^[a-z0-9_]+$/);
const AcsVar = z.string().regex(/^[BC]\d{5}[A-Z]?_\d{3}$/);

/** Plain-language names for the two counts behind a rate: `of` the numerator ("people below the
 *  poverty line"), `per` the denominator ("people whose poverty status is known"). */
const CountLabels = z.object({ of: z.string().min(3), per: z.string().min(3).optional() });

export const Relations = z.object({
  /** Maps whose shares of one shared total add up to 100% (with the remainder). */
  parts: z.record(Id, z.object({
    label: z.string(),
    /** One sentence for a regular reader: what adds up and what's left out. */
    explainer: z.string(),
    /** Display order (largest usually first). Every member uses the same ACS denominator. */
    members: z.array(Id).min(2),
    /** What's left of the total after the members: count = total − Σ members, so the parts add
     *  up exactly. `variables` are the ACS cells that make it up; their published margins give the
     *  remainder's margin (tighter than the difference formula), and the ingest checks they add up. */
    remainder: z.object({ id: Id, label: z.string(), variables: z.array(AcsVar).min(1) }).optional(),
  })).default({}),
  maps: z.record(Id, z.object({
    /** Topic group: the registry `category`, repeated so the list reads on its own. */
    group: z.string(),
    /** Required exactly when the ingest publishes counts for the map (see `countsSpec`). */
    counts: CountLabels.optional(),
  })),
  /** Hand-picked links between two maps, each with a short reason. Order doesn't matter. */
  links: z.array(z.object({ maps: z.tuple([Id, Id]), why: z.string() })).default([]),
});
export type Relations = z.infer<typeof Relations>;

/** The counts the ingest publishes behind a map (`values/<id>/<level>.counts.json`, rows
 *  [numerator, its MOE, denominator, its MOE]), or null when the value isn't a count or a ratio of
 *  counts (medians, indexes, modelled estimates). CDC PLACES stays percentages only (#156, Robbie's
 *  default until he says otherwise). */
export function countsSpec(e: DatasetEntry): { denominator: boolean } | null {
  const m = e.measure;
  switch (m.kind) {
    case "acs5": return m.denominator ? { denominator: true } : m.perSqMi ? { denominator: false } : null;
    case "census2020": return { denominator: m.value === "pct_vacant" };
    case "fars": return { denominator: true };
    case "lodes": case "ddp_287g": return { denominator: false };
    default: return null;
  }
}

/** Folders under values/ that aren't datasets; a map or remainder id may not take these names. */
export const RESERVED_VALUE_DIRS = ["tracts", "counts"];

const key = (a: string, b: string) => [a, b].sort().join("|");

/** Every problem with the relations file against the registry (empty = valid). */
export function checkRelations(rel: Relations, entries: DatasetEntry[]): string[] {
  const out: string[] = [];
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const e of entries) {
    const r = rel.maps[e.id];
    if (!r) { out.push(`${e.id}: no entry in relations.yaml (add it under maps:)`); continue; }
    if (r.group !== e.category) out.push(`${e.id}: group "${r.group}" must be the registry category "${e.category}"`);
    const spec = countsSpec(e);
    if (spec && !r.counts) out.push(`${e.id}: the ingest publishes counts for this map; add counts: { of${spec.denominator ? ", per" : ""} }`);
    if (!spec && r.counts) out.push(`${e.id}: has counts labels but the ingest publishes no counts for it`);
    if (spec && r.counts && spec.denominator !== !!r.counts.per) out.push(`${e.id}: counts.per ${spec.denominator ? "is required (the map is a rate)" : "must be left out (no denominator)"}`);
  }
  for (const id of Object.keys(rel.maps)) if (!byId.has(id)) out.push(`relations.yaml maps.${id}: no such registry dataset`);
  for (const id of [...byId.keys()]) if (RESERVED_VALUE_DIRS.includes(id)) out.push(`${id}: reserved name under values/`);

  const inSet = new Map<string, string>();
  const remainders = new Set<string>();
  for (const [setId, set] of Object.entries(rel.parts)) {
    const dens = new Set<string>();
    for (const m of set.members) {
      const e = byId.get(m);
      if (!e) { out.push(`parts.${setId}: unknown map ${m}`); continue; }
      if (inSet.has(m)) out.push(`parts.${setId}: ${m} is already in parts.${inSet.get(m)}`);
      inSet.set(m, setId);
      if (e.measure.kind !== "acs5" || !e.measure.denominator) { out.push(`parts.${setId}: ${m} isn't an ACS rate`); continue; }
      if (e.measure.blockGroup) out.push(`parts.${setId}: ${m} uses other tables for block groups, so its parts wouldn't add up`);
      dens.add([...e.measure.denominator].sort().join("+"));
    }
    if (dens.size > 1) out.push(`parts.${setId}: members must share one denominator (found ${[...dens].join(" | ")})`);
    if (set.remainder) {
      const id = set.remainder.id;
      if (byId.has(id) || remainders.has(id) || RESERVED_VALUE_DIRS.includes(id)) out.push(`parts.${setId}: remainder id ${id} is taken`);
      remainders.add(id);
    }
  }
  const seen = new Set<string>();
  for (const { maps: [a, b] } of rel.links) {
    for (const id of [a, b]) if (!byId.has(id)) out.push(`links ${a} ↔ ${b}: unknown map ${id}`);
    if (a === b) out.push(`links ${a} ↔ ${b}: a map can't link to itself`);
    if (seen.has(key(a, b))) out.push(`links ${a} ↔ ${b}: listed twice`);
    seen.add(key(a, b));
  }
  return out;
}

/** What the web reads (apps/web/src/generated/relations.json): per map its group, its counts
 *  labels, its parts set and its links (both directions), plus the parts sets themselves. */
export function relationsExport(rel: Relations) {
  const maps: Record<string, { group: string; counts?: { of: string; per?: string }; parts?: string; links: Array<{ id: string; why: string }> }> = {};
  for (const [id, r] of Object.entries(rel.maps)) maps[id] = { ...r, links: [] };
  for (const [setId, set] of Object.entries(rel.parts)) for (const m of set.members) if (maps[m]) maps[m].parts = setId;
  for (const { maps: [a, b], why } of rel.links) {
    maps[a]?.links.push({ id: b, why });
    maps[b]?.links.push({ id: a, why });
  }
  return { parts: rel.parts, maps };
}
