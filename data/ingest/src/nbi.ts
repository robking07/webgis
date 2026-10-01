// FHWA National Bridge Inventory ingest, driven by registry entries with `measure.kind: nbi`.
// Share of bridges (or of bridge deck area) in a given condition, by state and county.
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, FIPS_RENAMES, log, splitCsv } from "./util.ts";
import { registerDataset, writeValues, type Value } from "./values.ts";
import { unzipEntry } from "./zip.ts";

export async function ingestNbi(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "nbi" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "nbi") continue;
    const { year, weight, condition, minBridges } = e.measure;
    await registerDataset(pool, e);
    const zip = await cached(`https://www.fhwa.dot.gov/bridge/nbi/${year}hwybronefiledel.zip`);
    const text = await unzipEntry(zip, /\.txt$/i);
    const acc = { state: new Map<string, [number, number, number]>(), county: new Map<string, [number, number, number]>() };
    let header: string[] | null = null, rows = 0;
    for (const line of text.split(/\r?\n/)) {
      if (!line) continue;
      const f = splitCsv(line).map((x) => x.trim());
      if (!header) { header = f; continue; }
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
    log(e.id, `${rows.toLocaleString()} highway bridges`);
    for (const level of e.geographyLevels) {
      if (level === "tract") continue;
      const values = new Map<string, Value>();
      for (const [g, [hit, tot, n]] of acc[level]) values.set(g, { value: n >= minBridges && tot > 0 ? (100 * hit) / tot : null, moe: null });
      await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
