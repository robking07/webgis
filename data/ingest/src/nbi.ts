// FHWA National Bridge Inventory ingest, driven by registry entries with `measure.kind: nbi`.
// Share of bridges (or of bridge deck area) in a given condition, by state and county,
// plus earlier inventories for the year control (`timeline`, D-36).
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { timelineStops } from "@webgis/registry/timeline";
import { cached, db, FIPS_RENAMES, log, splitCsv } from "./util.ts";
import { registerDataset, writeStopValues, writeValues, type Value } from "./values.ts";
import { unzipEntry } from "./zip.ts";

type Acc = Record<"state" | "county", Map<string, [number, number, number]>>;

/** [in condition, total weight, bridge count] by state and county for one inventory year. */
async function tally(e: DatasetEntry, year: number): Promise<Acc> {
  if (e.measure.kind !== "nbi") throw new Error("not nbi");
  const { weight, condition } = e.measure;
  const zip = await cached(`https://www.fhwa.dot.gov/bridge/nbi/${year}hwybronefiledel.zip`);
  const text = await unzipEntry(zip, /\.txt$/i);
  const acc: Acc = { state: new Map(), county: new Map() };
  let header: string[] | null = null, rows = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const f = splitCsv(line).map((x) => x.trim());
    if (!header) {
      header = f;
      // BRIDGE_CONDITION and DECK_AREA (FHWA's own fields) start with the 2019 inventory.
      for (const k of ["BRIDGE_CONDITION", "DECK_AREA"]) if (!header.includes(k)) throw new Error(`NBI ${year}: no ${k} column`);
      continue;
    }
    const H = (k: string) => f[header!.indexOf(k)];
    if (H("RECORD_TYPE_005A") !== "1") continue; // on-highway records only
    const st = H("STATE_CODE_001").padStart(2, "0");
    const rawCty = st + H("COUNTY_CODE_003").padStart(3, "0");
    const cty = FIPS_RENAMES[rawCty] ?? rawCty;
    const w = weight === "deckArea" ? Number(H("DECK_AREA")) || 0 : 1;
    const hit = H("BRIDGE_CONDITION") === condition ? w : 0;
    for (const [lvl, g] of [["state", st], ["county", cty]] as const) {
      const a = acc[lvl].get(g) ?? [0, 0, 0];
      a[0] += hit; a[1] += w; a[2] += 1;
      acc[lvl].set(g, a);
    }
    rows++;
  }
  log(e.id, `${year}: ${rows.toLocaleString()} highway bridges`);
  return acc;
}

function shares(e: DatasetEntry, acc: Acc, level: "state" | "county"): Map<string, Value> {
  const minBridges = e.measure.kind === "nbi" ? e.measure.minBridges : 10;
  const values = new Map<string, Value>();
  for (const [g, [hit, tot, n]] of acc[level]) values.set(g, { value: n >= minBridges && tot > 0 ? (100 * hit) / tot : null, moe: null });
  return values;
}

export async function ingestNbi(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "nbi" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "nbi") continue;
    await registerDataset(pool, e);
    const acc = await tally(e, e.measure.year);
    for (const level of e.geographyLevels) {
      if (level === "tract") continue;
      await writeValues(pool, e.id, level, shares(e, acc, level));
    }
  }
  await pool.end();
}

/** Earlier inventories (D-36), web export only. NBI county codes follow the year's own
 *  geography, so the 2019 inventory uses 2019 boundaries. */
export async function ingestNbiTimeline(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "nbi" && e.timeline && (!only || only.includes(e.id)));
  for (const e of entries) {
    for (const s of timelineStops(e)) {
      if (s.isDefault) continue;
      const acc = await tally(e, +s.id);
      for (const level of e.geographyLevels) if (level !== "tract") writeStopValues(e.id, s.id, level, shares(e, acc, level));
    }
  }
}
