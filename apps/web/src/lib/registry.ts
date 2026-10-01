import type { DatasetEntry } from "@webgis/registry";
import entries from "@/generated/registry.json";

export type Dataset = DatasetEntry;
export const DATASETS = entries as unknown as Dataset[];
export const DATASET_BY_ID = new Map(DATASETS.map((d) => [d.id, d]));
export const CATEGORIES = [...new Set(DATASETS.map((d) => d.category))].sort();

export function searchDatasets(q: string, category: string | null): Dataset[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return DATASETS.filter((d) => {
    if (category && d.category !== category) return false;
    const hay = [d.title, d.description, d.category, ...d.tags, d.source.name].join(" ").toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}
