// Builds a dataset's CSV in the browser from the value files the site already serves (no server).
import type { GeoLevel } from "@webgis/design";
import { loadMoes, loadValues, type Values } from "./values";
import type { Dataset } from "./registry";
import { fetchRetry, staticUrl } from "@/lib/static-files";
import type { TractGeoShard, TractShard } from "./details";
import { xlsx, type Cell } from "./xlsx";

/** Levels that have a downloadable values file (blocks keep their values in the tiles, D-124). */
export const CSV_LEVELS: GeoLevel[] = ["state", "county", "tract", "block_group"];
export const CSV_LEVEL_LABEL: Record<string, string> = { state: "States", county: "Counties", tract: "Census tracts", block_group: "Block groups" };

export function csvFileName(d: Pick<Dataset, "id" | "vintage">, level: string): string {
  const vintage = d.vintage.replace(/\s*\(.*$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `mapwich-${d.id}-${level}-${vintage}.csv`;
}

/** Quote a field when it has a comma, quote, or line break (RFC 4180). */
export function csvField(s: string | number): string {
  const t = String(s);
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** Readable place name for a GEOID; tracts and block groups are named through their county. */
export function placeLabel(geoid: string, names: Record<string, string>): string {
  if (geoid.length <= 5) return names[geoid] ?? geoid;
  const county = names[geoid.slice(0, 5)];
  const tract = `Census tract ${Number(geoid.slice(5, 11)) / 100}`;
  const label = geoid.length === 12 ? `Block group ${geoid.slice(11)}, ${tract}` : tract;
  return county ? `${label}, ${county}` : label;
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** A level's whole CSV from the published value files (the data page). */
export async function buildCsv(d: Dataset, level: GeoLevel, load = loadValues, names?: Record<string, string>, loadMoe = loadMoes): Promise<{ blob: Blob; rows: number }> {
  const [values, nm, moes] = await Promise.all([
    load(d.id, level),
    names ?? fetchRetry(staticUrl("geo/names.json")).then((r) => r.json() as Promise<Record<string, string>>),
    marginsFor(d, level, loadMoe),
  ]);
  return csvFile(d, Object.keys(values).sort(), values, moes, nm);
}

/** Margins of error (survey datasets only; values/<id>/<level>.moe.json, D-257). Empty when none are published, so no column is written. */
export const marginsFor = (d: Dataset, level: GeoLevel, loadMoe = loadMoes): Promise<Values> =>
  d.measure.kind === "acs5" ? loadMoe(d.id, level).catch((): Values => ({})) : Promise.resolve({});

/** Writes `ids` (in that order) as CSV, in slices so a ~85k-row level never freezes the page.
 *  The margin column appears only when `moes` has any entries. */
export async function csvFile(d: Dataset, ids: string[], values: Values, moes: Values, nm: Record<string, string>): Promise<{ blob: Blob; rows: number }> {
  const hasMoe = Object.keys(moes).length > 0;
  const parts: string[] = ["﻿" + ["geoid", "name", "value", ...(hasMoe ? ["margin of error (±)"] : []), "unit"].join(",") + "\r\n"];
  const unit = csvField(d.unit);
  for (let i = 0; i < ids.length; i += 10000) {
    parts.push(ids.slice(i, i + 10000).map((g) =>
      [csvField(g), csvField(placeLabel(g, nm)), values[g], ...(hasMoe ? [moes[g] ?? ""] : []), unit].join(",") + "\r\n").join(""));
    await tick();
  }
  // Notes go after the data, not before it: lines above the header would break Excel's header detection.
  parts.push("\r\n" + [
    `# Source: ${d.source.name}, ${d.vintage}`,
    `# Cite as: ${d.source.citation}`,
    `# License: ${d.license}`,
    `# Downloaded from Mapwich: https://mapwich.org/data/${d.id}`,
  ].map((l) => `"${l.replace(/"/g, '""')}"\r\n`).join(""));
  return { blob: new Blob(parts, { type: "text/csv;charset=utf-8" }), rows: ids.length };
}

/** A place's rows as a CSV: value, margin of error, unit, period and source per dataset (issue #290). */
export function placeCsv(geoid: string, name: string, rows: Array<{ d: Dataset; value: number | null; moe: number | null }>): Blob {
  const head = ["dataset", "value", "margin of error (±)", "unit", "period", "source", "citation"].join(",") + "\r\n";
  const body = rows.map(({ d, value, moe }) =>
    [d.title, value ?? "", moe ?? "", d.unit, d.vintage, d.source.name, d.source.citation].map(csvField).join(",") + "\r\n").join("");
  const notes = [`# Place: ${name}`, `# Downloaded from Mapwich: https://mapwich.org/place/${geoid}`].map((l) => `"${l.replace(/"/g, '""')}"\r\n`).join("");
  return new Blob(["\uFEFF", head, body, "\r\n", notes], { type: "text/csv;charset=utf-8" });
}

/** A county's region data pack (#370): every map for its tracts, one row per tract, a value and a
 *  `<id>_moe` column per map, and an "about" sheet saying what each column is. GEOID is text. */
export function tractPack(county: string, name: string, values: TractShard, geo: TractGeoShard, datasets: Dataset[]): Blob {
  const ds = datasets.filter((d) => values[d.id]);
  const tracts = [...new Set([...Object.keys(geo), ...ds.flatMap((d) => Object.keys(values[d.id]))])].sort();
  const data: Cell[][] = [
    ["GEOID", "name", ...ds.flatMap((d) => [d.id, `${d.id}_moe`])],
    ...tracts.map((t) => [county + t, geo[t]?.[0] ?? `Tract ${Number(t) / 100}, ${name}`, ...ds.flatMap((d) => values[d.id][t] ?? [null, null])]),
  ];
  const about: Cell[][] = [
    ["column", "title", "unit", "period", "source", "citation", "license", "map"],
    ["GEOID", "11-digit 2020 census tract ID, stored as text. Join it to the GEOID field of Census tract boundaries."],
    ["name", "Tract name"],
    ...ds.flatMap((d) => [
      [d.id, d.title, d.unit, d.vintage, d.source.name, d.source.citation, d.license, `https://mapwich.org/data/${d.id}`],
      [`${d.id}_moe`, `${d.title}: margin of error (±), blank when the source publishes none`, d.unit, d.vintage],
    ]),
    [],
    [`Downloaded from Mapwich: https://mapwich.org/place/${county} (${name})`],
  ];
  return xlsx([{ name: "data", rows: data }, { name: "about", rows: about }]);
}

export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
