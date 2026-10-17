"use client";
// "Compare with…" in the details panel (roadmap 1.1, issue #117): pick a second place at the same
// level, then open /compare/<A>/<B>. States and counties are searched in the place index (only that
// level); tracts aren't in it, so a tract is picked by tapping a second one on the map.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GeoLevel } from "@webgis/design";
import { canCompare, compareGeoid, compareHref, searchAtLevel, shortName } from "@/lib/compare";
import type { Dataset } from "@/lib/registry";
import { loadPlaceIndex, type PlaceRow } from "@/lib/search";

const link = "rounded text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring";

/** `aValue`: this place's value for the map's dataset (undefined while loading or not known);
 *  `otherPeriod`: the map shows a year other than the default. See canCompare. */
export function CompareWith({ geoid, level, name, dataset, aValue, otherPeriod }: {
  geoid: string; level: GeoLevel; name: string; dataset: Dataset; aValue?: number | null; otherPeriod?: boolean;
}) {
  const datasetId = dataset.id;
  const router = useRouter();
  const a = compareGeoid(geoid, level);
  const tractMode = a?.length === 11;
  const [open, setOpen] = useState(false);
  /** Tracts: the first tract, waiting for a tap on a second. Kept while the panel switches places. */
  const [pick, setPick] = useState<string | null>(null);
  // A new place closes a search picker (adjusted during render, not in an effect).
  const [seen, setSeen] = useState(geoid);
  if (seen !== geoid) { setSeen(geoid); setOpen(false); if (pick && a?.length !== 11) setPick(null); }

  // The second tap on the map: a different tract opens the comparison.
  useEffect(() => {
    if (pick && a && a.length === 11 && a !== pick) router.push(compareHref({ a: pick, b: a, d: datasetId }));
  }, [pick, a, datasetId, router]);

  // A pick in progress stays visible while the second tract loads; otherwise only where a comparison works.
  if (!a || (!pick && !canCompare(dataset, level, { otherPeriod, aValue }))) return null;
  const stop = (e: React.PointerEvent) => e.stopPropagation();

  if (tractMode) {
    if (pick) {
      return (
        <div className="mt-2 rounded-md border px-3 py-2 text-xs" data-compare-pick="" onPointerDown={stop}>
          <p>Tap another tract on the map to compare it with this one.</p>
          <button type="button" onClick={() => setPick(null)} className={`${link} mt-1`}>Cancel</button>
        </div>
      );
    }
    return (
      <div className="mt-2" onPointerDown={stop}>
        <button type="button" onClick={() => setPick(a)} className={link}>Compare with…</button>
        {level !== "tract" && <p className="text-xs text-muted-foreground">Places compare at the tract level, so this uses the tract it sits in.</p>}
      </div>
    );
  }

  return (
    <div className="mt-2" onPointerDown={stop}>
      {open ? <Picker a={a} level={level} name={name} datasetId={datasetId} onCancel={() => setOpen(false)} />
        : <button type="button" onClick={() => setOpen(true)} className={link}>Compare with…</button>}
    </div>
  );
}

/** The search for place B. The place page uses it too, with no dataset (the compare page then leads with the landing map's). */
export function Picker({ a, level, name, datasetId, onCancel }: { a: string; level: GeoLevel; name: string; datasetId: string | null; onCancel: () => void }) {
  const [rows, setRows] = useState<PlaceRow[] | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => { loadPlaceIndex().then(setRows, () => setErr(true)); }, []);
  const hits = useMemo(() => (rows ? searchAtLevel(rows, q, level, a, 6) : []), [rows, q, level, a]);
  const what = level === "state" ? "state" : "county";
  return (
    <div className="rounded-md border p-2" data-compare-picker="">
      <label className="block text-xs text-muted-foreground" htmlFor="compare-with">Compare {shortName(name)} with another {what}</label>
      <input id="compare-with" type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } }}
        placeholder={level === "state" ? "Search states" : "Search counties"}
        className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring" />
      {err ? <p className="mt-1 text-xs text-muted-foreground">Search is unavailable right now.</p>
        : q.trim().length >= 2 && rows && (
          hits.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No {level === "state" ? "states" : "counties"} match.</p> : (
            <ul className="mt-1">
              {hits.map((h) => (
                <li key={h.geoid}>
                  <Link href={compareHref({ a, b: h.geoid!, d: datasetId })} className="block rounded px-1.5 py-1.5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">{h.name}</Link>
                </li>
              ))}
            </ul>
          ))}
      <button type="button" onClick={onCancel} className={`${link} mt-1`}>Cancel</button>
    </div>
  );
}
