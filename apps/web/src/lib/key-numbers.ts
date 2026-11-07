// The dataset page's key numbers (issue #244): the U.S. value and the top three states and cities.
import { gradeEstimate } from "@webgis/design";
import { isRaceRow } from "./place";
import type { Dataset } from "./registry";

export type Row = { name: string; value: number; moe: number | null };

/** Topics about groups of people always rank "Highest", whatever the registry says (lead, #244). */
const PEOPLE_TOPICS = new Set(["Race and ethnicity", "Immigration and language", "Disability", "Income and poverty", "Social vulnerability", "Environmental justice", "Population and age"]);

/** Which end to list: "low" only where the registry says lower is better and the topic isn't about
 *  groups of people; null for race and ethnicity, which never get a ranking (#414). */
export function rankOrder(d: Pick<Dataset, "subcategory" | "symbology">): "high" | "low" | null {
  if (isRaceRow(d)) return null;
  return d.symbology.higherIsBetter === false && !PEOPLE_TOPICS.has(d.subcategory) ? "low" : "high";
}

/** The first three in `order`, leaving out estimates graded unreliable (D-222) when `graded`;
 *  `skipped` counts those left out ahead of the third place, so the page can say so. */
export function topThree(rows: Row[], order: "high" | "low", graded: boolean): { top: Row[]; skipped: number } {
  const sorted = [...rows].sort((a, b) => (order === "high" ? b.value - a.value : a.value - b.value));
  const top: Row[] = [];
  let skipped = 0;
  for (const r of sorted) {
    if (top.length === 3) break;
    if (graded && gradeEstimate(r.value, r.moe) === "unreliable") skipped++;
    else top.push(r);
  }
  return { top, skipped };
}
