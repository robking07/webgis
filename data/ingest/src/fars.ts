// NHTSA Fatality Analysis Reporting System ingest, driven by registry entries with
// `measure.kind: fars`. Average annual traffic deaths per 100k residents, by state and county.
import { loadRegistry } from "@webgis/registry/load";
import { cached, db, FIPS_RENAMES, log, splitCsv } from "./util.ts";
import { registerDataset, writeValues, type Level, type Value } from "./values.ts";
import { unzipEntry } from "./zip.ts";

async function population(pool: Awaited<ReturnType<typeof db>>, level: Level): Promise<Map<string, number>> {
  // Population = ACS population density × land area (both already loaded).
  const { rows } = await pool.query<{ geoid: string; pop: number }>(
    `select v.geoid, v.value * g.aland_sqmi as pop from public.dataset_values v join public.geographies g using (geoid)
     where v.dataset_id = 'population_density' and v.level = $1 and v.value is not null`, [level]);
  if (!rows.length) throw new Error("population_density must be loaded before FARS (it supplies the denominator)");
  return new Map(rows.map((r) => [r.geoid, r.pop]));
}

export async function ingestFars(only?: string[]) {
  const entries = loadRegistry().filter((e) => e.measure.kind === "fars" && (!only || only.includes(e.id)));
  const pool = db();
  for (const e of entries) {
    if (e.measure.kind !== "fars") continue;
    const { years, perPopulation } = e.measure;
    await registerDataset(pool, e);
    const deaths = { state: new Map<string, number>(), county: new Map<string, number>() };
    let unknownCounty = 0, total = 0;
    for (let y = years[0]; y <= years[1]; y++) {
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
        total += n;
        deaths.state.set(st, (deaths.state.get(st) ?? 0) + n);
        if (c >= 997 || c === 0) { unknownCounty += n; continue; }
        const raw = st + String(c).padStart(3, "0");
        const g = FIPS_RENAMES[raw] ?? raw;
        deaths.county.set(g, (deaths.county.get(g) ?? 0) + n);
      }
    }
    const nYears = years[1] - years[0] + 1;
    log(e.id, `${total.toLocaleString()} deaths ${years[0]}–${years[1]} (${unknownCounty} with unknown county, state totals only)`);
    for (const level of e.geographyLevels) {
      if (level === "tract") continue;
      const pop = await population(pool, level);
      const values = new Map<string, Value>();
      for (const [g, p] of pop) {
        if (g.startsWith("72")) continue; // FARS doesn't cover Puerto Rico
        values.set(g, { value: p > 0 ? ((deaths[level].get(g) ?? 0) / nYears / p) * perPopulation : null, moe: null });
      }
      // Deaths under codes that aren't current geography (Connecticut's pre-2022 counties,
      // retired Alaska/South Dakota codes). If that's more than 5% of a state's deaths, its
      // counties would read falsely low, so they get no value instead.
      const lostByState = new Map<string, number>();
      for (const [g, n] of deaths[level]) if (!pop.has(g)) lostByState.set(g.slice(0, 2), (lostByState.get(g.slice(0, 2)) ?? 0) + n);
      for (const [st, n] of lostByState) {
        const share = n / (deaths.state.get(st) ?? n);
        log(e.id, `${level}: ${n} deaths in state ${st} under non-current codes (${(100 * share).toFixed(1)}%)${share > 0.05 ? " → its counties set to no data" : ""}`);
        if (share > 0.05) for (const g of values.keys()) if (g.startsWith(st)) values.set(g, { value: null, moe: null });
      }
      await writeValues(pool, e.id, level, values);
    }
  }
  await pool.end();
}
