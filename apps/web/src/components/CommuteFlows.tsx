"use client";
// Commute flows (#469): where a county's workers live and where its residents work, from the LODES 8
// origin-destination files (ingest `commute`, put on R2 by the Data run). On the place page it loads
// with the page; in the map's county card nothing loads until "Show commute flows" is tapped, which
// also draws the lines (`onLines`). Any failure just leaves the section out.
import { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";
import { placeName } from "@/lib/place-name";
import { loadPlaceIndex } from "@/lib/search";
import { fetchRetry, staticUrl } from "@/lib/static-files";

/** [county, jobs]; per county [workers, working residents, both in the county, top homes, top workplaces] (ingest commute.ts). */
type Flow = [string, number];
type CountyFlows = [number, number, number, Flow[], Flow[]];
interface Commute { year: number; years: Record<string, number>; counties: Record<string, CountyFlows> }

// shortcut: a failed load is remembered until the page reloads; retry here if R2 blips turn out to matter.
let cache: Promise<Commute | null> | null = null;
const load = () => (cache ??= fetchRetry(staticUrl("commute/commute.json")).then((r) => (r.ok ? r.json() : null)).catch(() => null));

/** Straight lines from the county to each county in its two top-10 lists, `w` = commuters both ways over the biggest. */
async function flowLines(geoid: string, [, , , live, work]: CountyFlows): Promise<FeatureCollection> {
  const at = new Map((await loadPlaceIndex()).filter((r) => r[1] === "County").map((r) => [r[2], [r[3], r[4]]]));
  const n = new Map<string, number>();
  for (const [g, k] of [...live, ...work]) n.set(g, (n.get(g) ?? 0) + k);
  const max = Math.max(...n.values()), from = at.get(geoid);
  return {
    type: "FeatureCollection",
    features: [...n].flatMap(([g, k]) => {
      const to = at.get(g);
      return from && to ? [{ type: "Feature" as const, properties: { w: k / max }, geometry: { type: "LineString" as const, coordinates: [from, to] } }] : [];
    }),
  };
}

const num = (n: number) => n.toLocaleString("en-US");
const pct = (n: number, of: number) => (!n ? "0%" : n / of < 0.005 ? "<1%" : `${Math.round((100 * n) / of)}%`);
const short = (g: string) => placeName(g)?.split(",")[0] ?? g;

function List({ title, lead, rows, of }: { title: string; lead: string; rows: Flow[]; of: number }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{lead}</p>
      <ol className="mt-1 text-sm">
        {rows.map(([g, n]) => (
          <li key={g} className="flex justify-between gap-2 border-b border-border/60 py-0.5">
            <span>{placeName(g) ?? g}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{num(n)} · {pct(n, of)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CommuteFlows({ geoid, onLines }: { geoid: string; onLines?: (lines: FeatureCollection | null) => void }) {
  const [open, setOpen] = useState(!onLines);
  const [data, setData] = useState<Commute | null>();
  useEffect(() => {
    if (!open) return;
    let live = true;
    load().then((d) => live && setData(d));
    return () => { live = false; };
  }, [open]);
  const c = data?.counties[geoid];
  useEffect(() => {
    if (!onLines || !open || !c) return;
    let live = true;
    flowLines(geoid, c).then((fc) => live && onLines(fc), () => {});
    return () => { live = false; onLines(null); };
  }, [onLines, open, c, geoid]);

  const link = "rounded text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring";
  if (onLines && !open) return <button type="button" onClick={() => setOpen(true)} className={`mt-2 ${link}`} data-commute-show="">Show commute flows</button>;
  if (!c) return onLines && data !== undefined ? <p className="mt-2 text-xs text-muted-foreground">No commute data for this county.</p> : null;
  const [workers, residents, same, live, work] = c;
  const name = short(geoid);
  return (
    <section aria-labelledby="commute-flows" className={onLines ? "mt-3" : "mb-6"} data-commute-flows="">
      <h2 id="commute-flows" className="text-base font-semibold">Commuting</h2>
      <div className={`mt-1 grid gap-4 ${onLines ? "" : "sm:grid-cols-2"}`}>
        <List title="Where its workers live" lead={`${num(workers)} workers; ${pct(same, workers)} live in ${name}.`} rows={live} of={workers} />
        <List title="Where its residents work" lead={`${num(residents)} working residents; ${pct(same, residents)} work in ${name}.`} rows={work} of={residents} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Source: U.S. Census Bureau, LEHD Origin-Destination Employment Statistics (LODES 8), {data!.years[geoid.slice(0, 2)] ?? data!.year}.
        Counts are jobs, so a person with two jobs counts twice.
      </p>
      {onLines && <button type="button" onClick={() => setOpen(false)} className={`mt-1 ${link}`}>Hide commute flows</button>}
    </section>
  );
}
