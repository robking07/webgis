// Timeline stops (D-36): the moments in time the map can step through for one dataset.
// Shared by the ingest (what to fetch and where to write it) and the web app (the year control),
// so both name and label periods the same way.
import type { DatasetEntry } from "./schema.ts";

export interface TimelineStop {
  /** Path segment of the stop's values (`values/<dataset>/<id>/<level>.json`). The default
   *  stop's values live at the dataset's usual path instead. */
  id: string;
  /** What the control shows, e.g. "2010–2014" or "2021". */
  label: string;
  /** The headline value (`vintage`): what the map opens on and what comparisons use. */
  isDefault: boolean;
  /** County and tract boundaries the values are keyed to. "2019" = 2010 tracts and the
   *  counties before Connecticut's 2022 planning regions; omitted = the current tiles. */
  boundaries?: "2019";
}

/** Levels that have a boundary file for each older vintage on R2 (`county-2019.pmtiles`, ...).
 *  Other levels (block group, block) exist only for the current boundaries. */
export const VINTAGE_BOUNDARY_LEVELS: Record<"2019", readonly string[]> = { "2019": ["county", "tract"] };

/** Boundary file name (no extension) for a level under a vintage: the dated file where one
 *  exists, otherwise the current one. Never names a file that isn't there. */
export function boundaryFile(level: string, boundaries?: string | null): string {
  const has = boundaries ? VINTAGE_BOUNDARY_LEVELS[boundaries as "2019"]?.includes(level) : false;
  return has ? `${level}-${boundaries}` : level;
}

/** Years of a dataset's `timeline`, oldest first. */
export function timelineYears(e: DatasetEntry): number[] {
  if (!e.timeline) return [];
  const { from, to, step } = e.timeline;
  const out: number[] = [];
  for (let y = from; y <= to; y += step) out.push(y);
  return out;
}

/** Last year of the headline ACS period (5-year estimates are named by their last year). */
export const ACS_HEADLINE_YEAR = 2024;

/** Every stop, oldest first, with the default where it falls in time (an average goes last). */
export function timelineStops(e: DatasetEntry): TimelineStop[] {
  const years = timelineYears(e);
  if (!years.length) return [];
  const pre2020 = (y: number) => (y < 2020 ? { boundaries: "2019" as const } : {});
  switch (e.measure.kind) {
    case "acs5":
      return years.map((y) => ({ id: String(y), label: `${y - 4}–${y}`, isDefault: y === ACS_HEADLINE_YEAR, ...pre2020(y) }));
    case "fars": {
      const [a, b] = e.measure.years;
      return [
        ...years.map((y) => ({ id: String(y), label: String(y), isDefault: false, ...pre2020(y) })),
        { id: "avg", label: `${a}–${b} average`, isDefault: true },
      ];
    }
    case "climdiv": {
      const [a, b] = e.measure.years;
      return [
        ...years.map((y) => ({ id: String(y), label: String(y), isDefault: false })),
        { id: "normal", label: `${a}–${b} normal`, isDefault: true },
      ];
    }
    case "nbi": { // annual inventories; the headline is the entry's `year`
      const { year } = e.measure;
      return years.map((y) => ({ id: String(y), label: String(y), isDefault: y === year, ...pre2020(y) }));
    }
    case "overdose": { // 12 months ending in endMonth of each year; the headline is the latest
      const { endYear, endMonth } = e.measure;
      const label = (y: number) => (endMonth === 12 ? String(y) : `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][endMonth - 1]} ${y}`);
      return years.map((y) => ({ id: String(y), label: label(y), isDefault: y === endYear }));
    }
    case "fema_declarations": // counts per decade (ids aren't years, so no change maps); the headline "since" count goes last
      return [
        ...years.map((y) => ({ id: `${y}s`, label: `${y}s`, isDefault: false })),
        { id: "since", label: `Since ${e.measure.since}`, isDefault: true },
      ];
    case "lodes": // LODES 8 keys every year to 2020 blocks, so current boundaries throughout
      return years.map((y) => ({ id: String(y), label: String(y), isDefault: y === +e.vintage }));
    default:
      return [];
  }
}
