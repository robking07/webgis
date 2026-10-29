// Unreliable areas to hatch (D-222). Nothing loads until the visitor turns hatching on: then the
// dataset's tract files for the counties in view (shared with the details panel's cache) and, at block-group
// zoom, the dataset's block-group margins.
import { useEffect, useMemo, useState } from "react";
import type { GeoLevel } from "@webgis/design";
import type { Dataset } from "@/lib/registry";
import { loadTractShard } from "@/lib/details";
import { loadMoes, loadValues } from "@/lib/values";
import { unreliableIn, unreliableTracts } from "@/lib/reliability";

export type Unreliable = Partial<Record<GeoLevel, ReadonlySet<string>>>;

/** `ds`: a gradable dataset with hatching on, else null. `counties`: 5-digit FIPS of counties whose
 *  tracts are on screen. Sets only grow while the dataset stays the same. */
export function useUnreliable(ds: Dataset | null, level: GeoLevel, counties: readonly string[]): Unreliable {
  const id = ds?.id ?? null;
  const [state, setState] = useState<{ id: string | null; tract: Set<string>; tractCounties: Set<string>; block_group?: Set<string> }>(
    { id: null, tract: new Set(), tractCounties: new Set() });
  // A new dataset starts empty (adjusted during render, not in an effect).
  if (state.id !== id) setState({ id, tract: new Set(), tractCounties: new Set() });

  const countyKey = level === "tract" ? [...counties].sort().join(",") : "";
  useEffect(() => {
    if (!id || !countyKey) return;
    let live = true;
    const todo = countyKey.split(",").filter((c) => !state.tractCounties.has(c));
    if (!todo.length) return;
    // One update per batch of counties, so the map refilters once.
    Promise.all(todo.map((c) => loadTractShard(c, [id]).then((s) => unreliableTracts(s, id, c), () => null))).then((lists) => {
      if (!live) return;
      setState((s) => {
        if (s.id !== id) return s;
        const tract = new Set(s.tract), tractCounties = new Set(s.tractCounties);
        lists.forEach((l, i) => { if (l) { tractCounties.add(todo[i]); for (const g of l) tract.add(g); } });
        return { ...s, tract, tractCounties };
      });
    });
    return () => { live = false; };
  }, [id, countyKey, state.tractCounties]);

  const wantBg = !!id && level === "block_group" && !state.block_group;
  useEffect(() => {
    if (!wantBg || !id) return;
    let live = true;
    Promise.all([loadValues(id, "block_group"), loadMoes(id, "block_group")]).then(([v, m]) => {
      if (live) setState((s) => (s.id === id ? { ...s, block_group: new Set(unreliableIn(v, m)) } : s));
    }, () => {});
    return () => { live = false; };
  }, [wantBg, id]);

  // Same object until a set changes, so the map only refilters on new data.
  const live = state.id === id && !!id;
  return useMemo(() => (live ? { tract: state.tract, block_group: state.block_group } : EMPTY), [live, state.tract, state.block_group]);
}
const EMPTY: Unreliable = {};
