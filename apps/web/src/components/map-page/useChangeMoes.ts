// Margins of error for a change map (issues #127, #188): both stops' published margin files
// (`values/<id>/[<stop>/]<level>.moe.json`, D-257, D-557), combined into the margin of the change.
// A level whose files are missing (or fail) stays untested: its middle class reads "No change".
import { useEffect, useState } from "react";
import type { GeoLevel } from "@webgis/design";
import { differenceMoe } from "@/lib/change";
import { loadValues, type LevelValues, type Values } from "@/lib/values";

/** `id`: the dataset, or null when there's nothing to test; `from`/`to`: stop ids (null = the
 *  default period). Returns level → geoid → margin of error of the change, per level as it loads. */
export function useChangeMoes(id: string | null, from: string | null, to: string | null, levels: readonly GeoLevel[]): LevelValues {
  const key = id ? `${id}@${from ?? ""}@${to ?? ""}` : null;
  const [state, setState] = useState<{ key: string | null; moes: LevelValues }>({ key: null, moes: {} });
  const levelKey = levels.join(",");
  useEffect(() => {
    if (!id || !levelKey) return;
    let live = true;
    for (const l of levelKey.split(",") as GeoLevel[]) {
      const moe = (stop: string | null) => loadValues(id, `${l}.moe` as GeoLevel, stop);
      Promise.all([moe(from), moe(to)]).then(([a, b]) => {
        const out: Values = {};
        for (const [g, m2] of Object.entries(b)) {
          const m = differenceMoe(a[g], m2);
          if (m != null) out[g] = m;
        }
        if (live) setState((s) => ({ key, moes: { ...(s.key === key ? s.moes : {}), [l]: out } }));
      }, () => {}); // no margin file for this map, stop or level: leave it untested
    }
    return () => { live = false; };
  }, [id, from, to, key, levelKey]);
  return state.key === key ? state.moes : NONE;
}
const NONE: LevelValues = {};
