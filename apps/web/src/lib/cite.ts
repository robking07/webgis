// "Copy for my memo" and the saved map image (issue #361): one citation for the current view.
import type { Dataset } from "./registry";

export interface CiteView {
  datasets: Dataset[];
  /** The selected or framed place, if any. */
  place?: string | null;
  /** The period the map shows ("2020–2024 (5-year estimate)", "2019 → 2024"). */
  period: string;
  url: string;
  date: Date;
}

export const accessDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

/** The map's name and period: "Median household income, Cook County, IL, 2020–2024 (5-year estimate)". */
export function citeTitle({ datasets, place, period }: Pick<CiteView, "datasets" | "place" | "period">): string {
  return [datasets.map((d) => d.title).join(" × "), place, period].filter(Boolean).join(", ");
}

/** The registry citations, once each (two maps can share a source). */
export function citeSources(datasets: Dataset[]): string {
  return [...new Set(datasets.map((d) => d.source.citation.trim().replace(/\.$/, "")))].join("; ");
}

/** One line for a memo or staff report: map, place, period, source, link, access date. */
export function memoCitation(v: CiteView): string {
  return `${citeTitle(v)}. Source: ${citeSources(v.datasets)}. Mapped by Mapwich, ${v.url}, accessed ${accessDate(v.date)}.`;
}
