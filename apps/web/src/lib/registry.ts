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

export function searchDatasets(q: string, category: string | null): Dataset[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return DATASETS.filter((d) => {
    if (category && d.category !== category) return false;
    const hay = [d.title, d.description, d.category, d.subcategory, ...d.tags, d.source.name].join(" ").toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}
