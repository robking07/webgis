import { sourceSlug } from "@webgis/registry/describe";
import { ALL_DATASETS, type Dataset } from "./registry";

export interface Source { slug: string; name: string; url: string; license: string; datasets: Dataset[] }

/** Datasets grouped by publishing source, largest first. */
export const SOURCES: Source[] = (() => {
  const m = new Map<string, Source>();
  for (const d of ALL_DATASETS) {
    const slug = sourceSlug(d.source.name);
    if (!m.has(slug)) m.set(slug, { slug, name: d.source.name, url: d.source.url, license: d.license, datasets: [] });
    m.get(slug)!.datasets.push(d);
  }
  for (const s of m.values()) s.datasets.sort((a, b) => a.title.localeCompare(b.title));
  return [...m.values()].sort((a, b) => b.datasets.length - a.datasets.length || a.name.localeCompare(b.name));
})();

export const sourceOf = (d: Dataset) => SOURCES.find((s) => s.slug === sourceSlug(d.source.name))!;
export const datasetHref = (id: string) => `/data/${id}`;
