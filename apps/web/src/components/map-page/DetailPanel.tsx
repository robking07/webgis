import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { StatusState } from "@webgis/design/components";
import { CHANGE_CLASSES, formatValue, GEO_LEVELS, gradeEstimate, isGradable, STATIC_ONLY_LEVELS, TILE_VALUE_LEVELS } from "@webgis/design";
import { reliabilityNote } from "@/lib/reliability";
import { changeSummary, differenceMoe, formatChange, withinMoe } from "@/lib/change";
import type { ClassedLevel } from "./useViewerData";
import type { HoverInfo } from "../map/MapView";
import type { Dataset } from "@/lib/registry";
import { placeHref, rankText } from "@/lib/place";
import { learnMoreLinks, type Link } from "@/lib/learn-more";
import { fetchDetail } from "@/lib/details";
import { loadMoes, type Values } from "@/lib/values";
import { BottomSheet, useIsPhone } from "../BottomSheet";
import { PlaceDataList, type Detail } from "../PlaceDataList";
import { LearnMore } from "./LearnMore";
import { loadPlaceIndex, placeByGeoid, type PlaceHit } from "@/lib/search";
import { CompareWith } from "../compare/CompareWith";

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
  /** Select and frame a place this one sits inside (the "inside" links, issue #34). */
  onPlace?: (p: PlaceHit) => void;
  /** Phones: the legend key, shown in the sheet with this place's class outlined. */
  legendKey?: { colors: string[]; cls: number | null; ends: [string, string] } | null;
  /** A change map (issue #127): both stops' labels, the earlier values at this level, and the
   *  change classification. `toIsDefault`: the later stop is the default, whose margins are known. */
  change?: { fromLabel: string; toLabel: string; fromValues?: Values; classed: ClassedLevel; toIsDefault: boolean; boundaryNote?: string | null };
}

/** The state and county a place sits inside (from its GEOID), coarse first. */
function useInside(geoid: string, level: string) {
  const [inside, setInside] = useState<PlaceHit[]>([]);
  // Clear the list when the place changes (state adjusted during render, not in an effect).
  const [seen, setSeen] = useState({ geoid, level });
  if (seen.geoid !== geoid || seen.level !== level) { setSeen({ geoid, level }); setInside([]); }
  useEffect(() => {
    let live = true;
    const ids = level === "state" ? [] : level === "county" ? [geoid.slice(0, 2)] : [geoid.slice(0, 2), geoid.slice(0, 5)];
    if (!ids.length) return;
    loadPlaceIndex().then((rows) => live && setInside(ids.map((id) => placeByGeoid(rows, id)).filter((p): p is PlaceHit => !!p)), () => {});
    return () => { live = false; };
  }, [geoid, level]);
  return inside;
}

/** "Minnesota › Hennepin County": tap a place to select it and frame it (digging back up). */
function InsideLinks({ inside, name, onPlace }: { inside: PlaceHit[]; name: string; onPlace?: (p: PlaceHit) => void }) {
  if (!inside.length) return null;
  return (
    <nav aria-label="Places this sits inside" className="mb-1 flex flex-wrap items-center gap-x-1 text-xs">
      {inside.map((p) => (
        <span key={p.geoid} className="flex items-center gap-1">
          <button type="button" onClick={() => onPlace?.(p)} onPointerDown={(e) => e.stopPropagation()}
            className="rounded font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            {p.name.split(",")[0]}
          </button>
          <span aria-hidden className="text-muted-foreground">›</span>
        </span>
      ))}
      <span className="text-muted-foreground" aria-current="location">{name.split(",")[0]}</span>
    </nav>
  );
}

/** The legend key inside the phone sheet: the place's class outlined, so its value reads against the key. */
function SheetKey({ colors, cls, ends }: { colors: string[]; cls: number | null; ends: [string, string] }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
      <span>{ends[0]}</span>
      <span className="flex items-center" aria-hidden>
        {colors.map((c, i) => (
          <span key={i} className={i === cls ? "relative z-10 h-3.5 w-6 rounded-[3px] ring-2 ring-foreground ring-offset-1 ring-offset-popover" : "h-2.5 w-5"} style={{ background: c }} />
        ))}
      </span>
      <span>{ends[1]}</span>
    </div>
  );
}

/** "Use with caution" / "Unreliable estimate" under an ACS value whose margin of error is large
 *  (D-222). Shown whether or not the map's hatching is on; nothing for other sources. */
function ReliabilityNote({ dataset, value, moe }: { dataset: Dataset; value?: number | null; moe?: number | null }) {
  const note = isGradable(dataset.measure.kind) ? reliabilityNote(gradeEstimate(value, moe)) : null;
  if (!note) return null;
  return (
    <p className="mt-1 text-xs text-muted-foreground" data-reliability="">
      <span className="font-semibold text-foreground">{note.title}.</span> {note.body}
    </p>
  );
}

/** A clicked place: its values, ranks and links (desktop panel; a BottomSheet on phones). */
/** A change map's card: the change, then both values, and "no clear change" when the difference is
 *  within its margin of error (√(MOE₁² + MOE₂²); see lib/change.ts). */
function ChangeCard({ dataset, geoid, change, to, toMoe, sheetKey }: { dataset: Dataset; geoid: string; change: NonNullable<DetailProps["change"]>; to?: number; toMoe?: number | null; sheetKey: ReactNode }) {
  const from = change.fromValues?.[geoid];
  const moe = isGradable(dataset.measure.kind) && change.toIsDefault && from != null && to != null ? differenceMoe(from, null, to, toMoe) : null;
  const steady = from != null && to != null && withinMoe(from, to, moe);
  const c = change.classed.change?.[geoid];
  // The headline says what the map's color and the hover card say (margins are tested on the map
  // for tracts only); the note below adds this panel's own test, which reaches counties and states too.
  const mapSteady = !!change.classed.tested && change.classed.classes.get(geoid) === (CHANGE_CLASSES - 1) / 2;
  const { headline } = changeSummary(c, from, to, change.classed.measure!, dataset.unit, mapSteady, change.boundaryNote);
  return (
    <div className="rounded-md bg-muted px-3 py-2" data-change-card="">
      <p className="text-xs text-muted-foreground">{dataset.title}, change since {change.fromLabel}</p>
      <p className="text-xl font-semibold tabular-nums" data-change-headline="">{headline}</p>
      {sheetKey}
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {change.fromLabel}: {formatValue(from, dataset.unit)} · {change.toLabel}: {formatValue(to, dataset.unit)}
      </p>
      {steady && (
        <p className="mt-1 text-xs text-muted-foreground">
          The change ({formatChange(c, change.classed.measure!, dataset.unit)}) is within the margin of error, so it may not be real.
        </p>
      )}
    </div>
  );
}

export function DetailPanel({ info, top, onClose, primary, secondary, xv, yv, onMapIt, period, onPlace, legendKey, change }: DetailProps) {
  const [rows, setRows] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const phone = useIsPhone();
  // Block groups and blocks aren't in the database (D-124): the mapped values come from the static
  // files (block groups, with margins of error from side files) or the tiles (blocks); there's no
  // all-datasets list or place profile below tracts.
  const staticOnly = STATIC_ONLY_LEVELS.has(info.level);
  // Back to "loading" whenever any input of the load below changes (adjusted during render, not in an effect).
  const loadDeps = [info.geoid, info.level, info.props, staticOnly, primary, secondary, xv, yv];
  const [seenDeps, setSeenDeps] = useState(loadDeps);
  if (seenDeps.some((v, i) => v !== loadDeps[i])) { setSeenDeps(loadDeps); setRows(null); setErr(null); }
  useEffect(() => {
    let live = true;
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

  const inside = useInside(info.geoid, info.level);
  const featured = [primary, secondary].filter((d): d is Dataset => !!d);
  const links = dedupe(featured.flatMap((d) => learnMoreLinks(d, { level: info.level, geoid: info.geoid, lon: info.lon, lat: info.lat })));
  const summary = (
    <>
      <InsideLinks inside={inside} name={info.name} onPlace={onPlace} />
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
              if (i === 0 && change) {
                return <ChangeCard key={d.id} dataset={d} geoid={info.geoid} change={change} to={xv?.[info.geoid]} toMoe={change.toIsDefault ? r?.moe : null}
                  sheetKey={phone && legendKey ? <SheetKey {...legendKey} /> : null} />;
              }
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
                  {i === 0 && phone && legendKey && <SheetKey {...legendKey} />}
                  {rank && <p className="mt-1 text-xs text-muted-foreground">{rank}</p>}
                  <ReliabilityNote dataset={d} value={r?.value} moe={r?.moe} />
                </div>
              );
            })}
          </div>
        )}
      <CompareWith geoid={info.geoid} level={info.level} name={info.name} dataset={primary} otherPeriod={!!period}
        aValue={!rows ? null : staticOnly ? undefined : rows[primary.id]?.value ?? null} />
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
