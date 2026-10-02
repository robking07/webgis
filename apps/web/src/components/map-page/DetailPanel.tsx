import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { StatusState } from "@webgis/design/components";
import { formatValue, GEO_LEVELS, STATIC_ONLY_LEVELS, TILE_VALUE_LEVELS } from "@webgis/design";
import type { HoverInfo } from "../map/MapView";
import type { Dataset } from "@/lib/registry";
import { placeHref, rankText } from "@/lib/place";
import { learnMoreLinks, type Link } from "@/lib/learn-more";
import { fetchDetail } from "@/lib/supabase";
import { loadMoes, type Values } from "@/lib/values";
import { BottomSheet, useIsPhone } from "../BottomSheet";
import { PlaceDataList, type Detail } from "../PlaceDataList";
import { LearnMore } from "./LearnMore";

const dedupe = (links: Link[]) => links.filter((l, i) => links.findIndex((m) => m.url === l.url) === i);

interface DetailProps {
  info: HoverInfo;
  /** Distance from the top: below the header while it shows (desktop panel only). */
  top: number;
  onClose: () => void;
  primary: Dataset;
  secondary: Dataset | null;
  /** Loaded values at the clicked feature's level, for the rank line. */
  xv?: Values;
  yv?: Values;
  /** Switch the map to another dataset (from the drawer's full list). */
  onMapIt: (id: string) => void;
  /** A timeline stop is shown (D-36): the primary value comes from `xv` for that period. */
  period?: { label: string; defaultLabel: string };
}

/** A clicked place: its values, ranks and links (desktop panel; a BottomSheet on phones). */
export function DetailPanel({ info, top, onClose, primary, secondary, xv, yv, onMapIt, period }: DetailProps) {
  const [rows, setRows] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const phone = useIsPhone();
  // Block groups and blocks aren't in the database (D-39): the mapped values come from the static
  // files (block groups, with margins of error from side files) or the tiles (blocks); there's no
  // all-datasets list or place profile below tracts.
  const staticOnly = STATIC_ONLY_LEVELS.has(info.level);
  useEffect(() => {
    let live = true;
    setRows(null); setErr(null);
    const load = staticOnly
      ? Promise.all([primary, secondary].filter((d): d is Dataset => !!d).map(async (d, i) => {
          const inTile = TILE_VALUE_LEVELS.has(info.level);
          const moes = inTile ? ({} as Values) : await loadMoes(d.id, info.level).catch(() => ({} as Values));
          // Blocks: the value is in the tile; 2020 Census counts have no margin of error.
          const fromTile = inTile && d.measure.kind === "census2020" ? (info.props?.[d.measure.value] as number | undefined) : undefined;
          return [d.id, { value: fromTile ?? (i === 0 ? xv : yv)?.[info.geoid] ?? null, moe: moes[info.geoid] ?? null }] as const;
        })).then((e) => Object.fromEntries(e) as Detail)
      : fetchDetail(info.geoid);
    load.then((r) => live && setRows(r), (e) => live && setErr(String(e.message ?? e)));
    return () => { live = false; };
  }, [info.geoid, info.level, info.props, staticOnly, primary, secondary, xv, yv]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const featured = [primary, secondary].filter((d): d is Dataset => !!d);
  const links = dedupe(featured.flatMap((d) => learnMoreLinks(d, { level: info.level, geoid: info.geoid, lon: info.lon, lat: info.lat })));
  const summary = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold leading-snug">{info.name}</h2>
          <p className="text-xs text-muted-foreground">{GEO_LEVELS[info.level].label}</p>
        </div>
        <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close details" className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <X className="size-4" />
        </button>
      </div>
      {err ? <StatusState status="error" message="Details are unavailable right now." />
        : !rows ? <StatusState status="loading" />
        : (
          <div className="space-y-2">
            {featured.map((d, i) => {
              const r = rows[d.id];
              if (i === 0 && period) {
                const v = xv?.[info.geoid];
                return (
                  <div key={d.id} className="rounded-md bg-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">{d.title}, {period.label}</p>
                    <p className="text-xl font-semibold tabular-nums">{formatValue(v, d.unit)}</p>
                    {rankText(xv, v, info.level) && <p className="text-xs text-muted-foreground">{rankText(xv, v, info.level)}</p>}
                    {r?.value != null && <p className="mt-1 text-xs text-muted-foreground">{period.defaultLabel}: <span className="tabular-nums">{formatValue(r.value, d.unit)}</span></p>}
                  </div>
                );
              }
              const rank = rankText(i === 0 ? xv : yv, r?.value, info.level);
              return (
                <div key={d.id} className="rounded-md bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">{d.title}</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {formatValue(r?.value, d.unit)}
                    {r?.moe != null && r.moe > 0 && r.value != null && <span className="ml-1 text-xs font-normal text-muted-foreground">±{formatValue(r.moe, d.unit)}</span>}
                  </p>
                  {rank && <p className="text-xs text-muted-foreground">{rank}</p>}
                </div>
              );
            })}
          </div>
        )}
      <LearnMore links={links} />
      {phone && rows && !staticOnly && <p className="mt-2 text-center text-xs text-muted-foreground group-data-[snap=full]:hidden">Swipe up for all {Object.keys(rows).length} datasets here</p>}
    </>
  );

  if (phone) {
    return (
      <BottomSheet label={`Details for ${info.name}`} summary={summary} onClose={onClose}>
        {rows && !staticOnly && (
          <>
            <PlaceDataList level={info.level} detail={rows} onMapIt={onMapIt} compact />
            <a href={placeHref(info.geoid)} className="mt-4 block text-sm font-medium text-primary underline-offset-2 hover:underline">Open the full place profile →</a>
          </>
        )}
      </BottomSheet>
    );
  }
  return (
    <section aria-label={`Details for ${info.name}`} data-obstructs=""
      className="absolute right-[72px] z-30 w-80 overflow-y-auto rounded-lg border bg-popover p-3 shadow-md transition-[top] duration-300"
      style={{ top, maxHeight: `calc(100% - ${top + 12}px)` }}>
      {summary}
      {rows && !staticOnly && (
        <a href={placeHref(info.geoid)}
          className="mt-3 flex items-center justify-between rounded text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          Full place profile: all datasets for {info.name.split(",")[0]} <span aria-hidden>→</span>
        </a>
      )}
    </section>
  );
}
