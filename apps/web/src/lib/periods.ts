// Timeline stops (D-36): which moments the year control offers for a dataset. Only stops
// whose values were exported (generated/periods.json) are offered, plus the default.
import exported from "@/generated/periods.json";
import { timelineStops, type TimelineStop } from "@webgis/registry/timeline";
import type { GeoLevel } from "@webgis/design";
import type { Dataset } from "./registry";

const EXPORTED = exported as Record<string, Record<string, GeoLevel[]>>;

export interface Stop extends TimelineStop {
  /** Levels with values at this stop (the default has all of the dataset's levels). */
  levels: GeoLevel[];
}

/** Stops for the year control, oldest first; empty when the dataset has a single moment. */
export function stopsFor(d: Dataset | null): Stop[] {
  if (!d) return [];
  const have = EXPORTED[d.id] ?? {};
  const stops = timelineStops(d)
    .filter((s) => s.isDefault || have[s.id])
    .map((s) => ({ ...s, levels: s.isDefault ? (d.geographyLevels as GeoLevel[]) : have[s.id] }));
  return stops.length > 1 ? stops : [];
}

/** A plain-language note for the legend about what a non-default stop is. */
export function stopNote(d: Dataset, s: Stop, level: GeoLevel): string | null {
  if (s.isDefault) return null;
  const notes: string[] = [];
  if (d.measure.kind === "acs5" && d.unit === "dollars") notes.push("Adjusted for inflation to 2024 dollars");
  if (s.boundaries && level === "tract") notes.push("2010 tract boundaries");
  if (s.boundaries && level === "county") notes.push("Connecticut shows its old counties");
  if (d.measure.kind === "fars") notes.push("One year: rates in small counties swing a lot");
  if (d.measure.kind === "climdiv") notes.push("One year, not the long-term normal");
  notes.push("Colors use the same breaks as the default view, so they show change");
  return notes.join(". ");
}

const DATED = /^\d{4}$/;

/** Stops a change map can start from: dated stops before `to` (the shown one), newest first.
 *  None when `to` is an average or normal (a change since then isn't a change over time). */
export function changeStops(stops: Stop[], to: Stop | null): Stop[] {
  if (!to || !DATED.test(to.id)) return [];
  return stops.slice(0, stops.indexOf(to)).filter((s) => DATED.test(s.id)).reverse();
}

/** The legend's note for a change map: what's matched across a boundary change. */
export function changeNote(from: Stop, to: Stop, level: GeoLevel): string | null {
  if (from.boundaries === to.boundaries) return null;
  if (level === "tract") return "Tracts are matched by their code; tracts split or merged in 2020 show no data";
  if (level === "county") return "Connecticut shows no data (its counties changed in 2022)";
  return null;
}

/** The period a change map runs to: the latest dated stop (the default, unless the default is an
 *  average or normal). Change always ends here, so the year control is off in change mode. */
export function latestStop(stops: Stop[]): Stop | null {
  const d = stops.find((s) => s.isDefault);
  return d && DATED.test(d.id) ? d : [...stops].reverse().find((s) => DATED.test(s.id)) ?? null;
}

/** Why one area has no change: its boundaries changed between the two periods. */
export function areaChangeNote(from: Stop, to: Stop, level: GeoLevel, geoid: string): string | null {
  if (from.boundaries === to.boundaries) return null;
  if (level === "tract") return "tract changed in 2020";
  if (level === "county" && geoid.startsWith("09")) return "Connecticut's counties changed in 2022";
  return null;
}
