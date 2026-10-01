// NHTSA Fatality Analysis Reporting System ingest, driven by registry entries with
// `measure.kind: fars`. Average annual traffic deaths per 100k residents, by state and county,
// plus single-year rates for the year control (`timeline`, D-36).
import { loadRegistry } from "@webgis/registry/load";
import type { DatasetEntry } from "@webgis/registry";
import { timelineStops } from "@webgis/registry/timeline";
import { cached, db, FIPS_RENAMES, log, splitCsv } from "./util.ts";
import { areas2019 } from "./geographies.ts";
import { landArea, readStopValues, registerDataset, writeStopValues, writeValues, type Level, type Value } from "./values.ts";
import { unzipEntry } from "./zip.ts";

type Pool = Awaited<ReturnType<typeof db>>;
interface Deaths { state: Map<string, number>; county: Map<string, number>; total: number; unknownCounty: number }

async function population(pool: Pool, level: Level): Promise<Map<string, number>> {
  // Population = ACS population density × land area (both already loaded).
  const { rows } = await pool.query<{ geoid: string; pop: number }>(
    `select v.geoid, v.value * g.aland_sqmi as pop from public.dataset_values v join public.geographies g using (geoid)
     where v.dataset_id = 'population_density' and v.level = $1 and v.value is not null`, [level]);
  if (!rows.length) throw new Error("population_density must be loaded before FARS (it supplies the denominator)");
  return new Map(rows.map((r) => [r.geoid, r.pop]));
}

/** 2015–2019 ACS population on 2019 boundaries, from the population_density timeline export. */
async function population2019(pool: Pool, level: Level): Promise<Map<string, number>> {
  const density = readStopValues("population_density", "2019", level);
  const areas = level === "state" ? await landArea(pool, "state") : await areas2019(level as "county");
  const out = new Map<string, number>();
  for (const [g, d] of density) { const a = areas.get(g); if (a) out.set(g, d * a); }
  return out;
}

async function readYears(from: number, to: number): Promise<Deaths> {
  const d: Deaths = { state: new Map(), county: new Map(), total: 0, unknownCounty: 0 };
  for (let y = from; y <= to; y++) {
    const zip = await cached(`https://static.nhtsa.gov/nhtsa/downloads/FARS/${y}/National/FARS${y}NationalCSV.zip`);
    const text = await unzipEntry(zip, /accident\.csv$/i);
    const lines = text.split(/\r?\n/);
    const h = splitCsv(lines[0]);
    const iS = h.indexOf("STATE"), iC = h.indexOf("COUNTY"), iF = h.indexOf("FATALS");
    if (iS < 0 || iC < 0 || iF < 0) throw new Error(`FARS ${y}: missing STATE/COUNTY/FATALS in header`);
    for (const line of lines.slice(1)) {
      if (!line) continue;
      const f = splitCsv(line);
      const st = String(Number(f[iS])).padStart(2, "0"), c = Number(f[iC]), n = Number(f[iF]) || 0;
      d.total += n;
      d.state.set(st, (d.state.get(st) ?? 0) + n);
      if (c >= 997 || c === 0) { d.unknownCounty += n; continue; }
      const raw = st + String(c).padStart(3, "0");
      const g = FIPS_RENAMES[raw] ?? raw;
      d.county.set(g, (d.county.get(g) ?? 0) + n);
    }
  }
  return d;
}

/** Annual deaths per `perPopulation` residents. Deaths under codes that aren't in the
 *  boundaries (Connecticut's pre-2022 counties on current tiles, retired Alaska/South Dakota
 *  codes): if that's more than 5% of a state's deaths, its counties would read falsely low,
 *  so they get no value instead. */
function rates(e: DatasetEntry, deaths: Deaths, level: "state" | "county", pop: Map<string, number>, nYears: number, tag: string): Map<string, Value> {
  const per = e.measure.kind === "fars" ? e.measure.perPopulation : 100000;
  const values = new Map<string, Value>();
  for (const [g, p] of pop) {
    if (g.startsWith("72")) continue; // FARS doesn't cover Puerto Rico
    values.set(g, { value: p > 0 ? ((deaths[level].get(g) ?? 0) / nYears / p) * per : null, moe: null });
  }
  const lostByState = new Map<string, number>();
  for (const [g, n] of deaths[level]) if (!pop.has(g)) lostByState.set(g.slice(0, 2), (lostByState.get(g.slice(0, 2)) ?? 0) + n);
  for (const [st, n] of lostByState) {
    const share = n / (deaths.state.get(st) ?? n);
    if (share > 0.01) log(e.id, `${tag} ${level}: ${n} deaths in state ${st} under non-current codes (${(100 * share).toFixed(1)}%)${share > 0.05 ? " → its counties set to no data" : ""}`);
    if (share > 0.05) for (const g of values.keys()) if (g.startsWith(st)) values.set(g, { value: null, moe: null });
  }
  return values;
}

export async function ingestFars(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "fars" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "fars") continue;
    const { years } = e.measure;
    await registerDataset(pool, e);
    const deaths = await readYears(years[0], years[1]);
    log(e.id, `${deaths.total.toLocaleString()} deaths ${years[0]}–${years[1]} (${deaths.unknownCounty} with unknown county, state totals only)`);
    for (const level of e.geographyLevels) {
      if (level === "tract") continue;
      await writeValues(pool, e.id, level, rates(e, deaths, level, await population(pool, level), years[1] - years[0] + 1, "avg"));
    }
  }
  await pool.end();
}

/** Single-year rates (D-36). Years before 2020 use 2019 boundaries and 2015–2019 ACS
 *  population (so Connecticut's old counties match FARS's codes); later years, the current
 *  ones. Single years in small counties swing a lot: the average stays the default. */
export async function ingestFarsTimeline(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "fars" && e.timeline && (!only || only.includes(e.id)));
  const pool = db();
  const pops = new Map<string, Map<string, number>>();
  const popFor = async (level: Level, old: boolean) => {
    const k = `${level}/${old}`;
    if (!pops.has(k)) pops.set(k, old ? await population2019(pool, level) : await population(pool, level));
    return pops.get(k)!;
  };
  for (const e of entries) {
    for (const s of timelineStops(e)) {
      if (s.isDefault) continue;
      const y = +s.id;
      const deaths = await readYears(y, y);
      log(e.id, `${y}: ${deaths.total.toLocaleString()} deaths`);
      for (const level of e.geographyLevels) {
        if (level === "tract") continue;
        writeStopValues(e.id, s.id, level, rates(e, deaths, level, await popFor(level, !!s.boundaries), 1, s.id));
      }
    }
  }
  await pool.end();
}
