// Timeline stops (D-34): which moments the year control offers for a dataset. Only stops
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
