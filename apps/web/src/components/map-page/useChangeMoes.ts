// Margins of error for a change map's tracts (issue #127): the shown (default) period's tract
// margins, from the dataset's tract files for the counties in view, the same files and cache the
// details panel and reliability hatching use (D-222). Nothing loads until a change map of an ACS
// dataset is at tract level.
import { useEffect, useState } from "react";
import { loadTractShard } from "@/lib/details";
import type { Values } from "@/lib/values";

/** `id`: the dataset, or null when there's nothing to test. Returns geoid → margin of error for the
 *  counties loaded so far; a new object only when more counties arrive. */
export function useChangeMoes(id: string | null, counties: readonly string[]): Values | null {
  const [state, setState] = useState<{ id: string | null; moes: Values; done: ReadonlySet<string> }>({ id: null, moes: {}, done: new Set() });
  // A new dataset starts empty (adjusted during render, not in an effect).
  if (state.id !== id) setState({ id, moes: {}, done: new Set() });

  const countyKey = id ? [...counties].sort().join(",") : "";
  useEffect(() => {
    if (!id || !countyKey) return;
    const todo = countyKey.split(",").filter((c) => !state.done.has(c));
    if (!todo.length) return;
    let live = true;
    Promise.all(todo.map((c) => loadTractShard(c, [id]).then((s) => s?.[id] ?? null, () => undefined))).then((rows) => {
      if (!live) return;
      setState((s) => {
        if (s.id !== id) return s;
        const moes = { ...s.moes }, done = new Set(s.done);
        rows.forEach((r, i) => {
          if (r === undefined) return; // failed: try again on the next report
          done.add(todo[i]);
          for (const [tract, [, moe]] of Object.entries(r ?? {})) if (moe != null) moes[todo[i] + tract] = moe;
        });
        return { ...s, moes, done };
      });
    });
    return () => { live = false; };
  }, [id, countyKey, state.done]);

  return state.id === id && id && state.done.size ? state.moes : null;
}
