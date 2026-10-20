import type { DatasetEntry } from "@webgis/registry";
import { CATEGORIES as CATEGORY_ORDER, CATEGORY_TREE } from "@webgis/registry/categories";
import entries from "@/generated/registry.json";

export type Dataset = DatasetEntry;
export const DATASETS = entries as unknown as Dataset[];
export const DATASET_BY_ID = new Map(DATASETS.map((d) => [d.id, d]));
/** The top-level categories that have maps, in Robbie's order (issue #199). */
export const CATEGORIES: string[] = CATEGORY_ORDER.filter((c) => DATASETS.some((d) => d.category === c));

/** Datasets grouped by subcategory, in category then subcategory order; empty groups are left out. */
export function bySubcategory(ds: Dataset[]): Array<{ category: string; subcategory: string; datasets: Dataset[] }> {
  return CATEGORY_ORDER.flatMap((category) => CATEGORY_TREE[category].map((subcategory) => ({
    category, subcategory, datasets: ds.filter((d) => d.category === category && d.subcategory === subcategory),
  }))).filter((g) => g.datasets.length);
}

/** Lowercase words with a space before and after each, so `includes(" du")` matches a word start
 *  and `includes(" du ")` a whole word. */
const words = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;

/** Each term must start a word in the title, topic, tags or source, or be a whole word in the
 *  description (issue #252: "du" matched "adults", "during", "duty" in the prose). Maps whose
 *  title has every term come first. */
export function searchDatasets(q: string, category: string | null): Dataset[] {
  const terms = words(q).split(" ").filter(Boolean);
  const inTitle = (d: Dataset) => terms.every((t) => words(d.title).includes(` ${t}`));
  return DATASETS.filter((d) => {
    if (category && d.category !== category) return false;
    const names = words([d.title, d.category, d.subcategory, ...d.tags, d.source.name].join(" ")), prose = words(d.description);
    return terms.every((t) => names.includes(` ${t}`) || prose.includes(` ${t} `));
  }).sort((x, y) => Number(!inTitle(x)) - Number(!inTitle(y))); // stable: registry order within each group
}
