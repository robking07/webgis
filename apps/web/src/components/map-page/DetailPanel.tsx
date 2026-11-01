import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useEscape } from "../useEscape";
import { X } from "lucide-react";
import { StatusState } from "@webgis/design/components";
import { CHANGE_CLASSES, formatEstimate, formatValue, GEO_LEVELS, isGradable, STATIC_ONLY_LEVELS, TILE_VALUE_LEVELS, type GeoLevel } from "@webgis/design";
import { moeRangeLine, noDataReason, reliabilityNote } from "@/lib/reliability";
import { changeSummary, formatChange } from "@/lib/change";
import type { ClassedLevel } from "./useViewerData";
import type { HoverInfo } from "../map/MapView";
import { DATASET_BY_ID, type Dataset } from "@/lib/registry";
import { isRaceRow, placeHref, rankText } from "@/lib/place";
import { learnMoreLinks, type Link } from "@/lib/learn-more";
import { fetchDetail, TRACT_IDS } from "@/lib/details";
import { loadMoes, type Values } from "@/lib/values";
import { BottomSheet, useIsPhone } from "../BottomSheet";
import { PlaceDataList, type Detail } from "../PlaceDataList";
import { Benchmarks } from "../Benchmarks";
import { LearnMore } from "./LearnMore";
import type { PlaceHit } from "@/lib/search";
import { placeChain } from "@/lib/place-chain";
import { CompareWith } from "../compare/CompareWith";
import { CommuteFlows } from "../CommuteFlows";
import type { FeatureCollection } from "geojson";

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
  /** Open a place this one sits inside (the "inside" links, issues #34, #364): select and frame it, or outline a city, metro or MPO. */
  onPlace?: (p: PlaceHit) => void;
  /** Phones: the legend key, shown in the sheet with this place's class outlined. */
  legendKey?: { colors: string[]; cls: number | null; ends: [string, string] } | null;
  /** A change map (issue #127): both stops' labels, the earlier values at this level, and the
   *  change classification. */
  change?: { fromLabel: string; toLabel: string; fromValues?: Values; classed: ClassedLevel; boundaryNote?: string | null };
  /** The map's finest level: a click here can't drill further down (issue #203), so say so. */
  finest?: boolean;
  /** Draw or clear the county's commute flow lines (#469); given only while this county is the focused one. */
  onFlows?: (lines: FeatureCollection | null) => void;
}

/** The places a clicked place sits inside, coarse first (state › MPO › metro › county › city › tract; issue #364). */
function useInside(geoid: string, level: GeoLevel, lon?: number, lat?: number) {
  const [inside, setInside] = useState<PlaceHit[]>([]);
  // Clear the list when the place changes (state adjusted during render, not in an effect).
  const [seen, setSeen] = useState({ geoid, level });
  if (seen.geoid !== geoid || seen.level !== level) { setSeen({ geoid, level }); setInside([]); }
  useEffect(() => {
    let live = true;
    placeChain(geoid, level, lon, lat).then((c) => live && setInside(c), () => {});
    return () => { live = false; };
  }, [geoid, level, lon, lat]);
  return inside;
}

/** "Edina" alone could be anything: metros and MPOs say what they are. */
const chainLabel = (p: PlaceHit) => {
  const short = p.name.split(",")[0];
  return p.kind === "Metro area" ? `${short} metro` : p.kind === "Micro area" ? `${short} micro area` : p.mpo && !/\bMPO\b/.test(short) ? `${short} (MPO)` : short;
};

/** "Minnesota › Metropolitan Council (MPO) › … › Edina": tap a place to open it (digging back up). */
function InsideLinks({ inside, name, onPlace }: { inside: PlaceHit[]; name: string; onPlace?: (p: PlaceHit) => void }) {
  if (!inside.length) return null;
  return (
    <nav aria-label="Places this sits inside" className="mb-1 flex flex-wrap items-center gap-x-1 text-xs" data-place-chain="">
      {inside.map((p) => (
        <span key={p.geoid ?? p.area ?? p.mpo?.id} className="flex items-center gap-1">
          <button type="button" onClick={() => onPlace?.(p)} onPointerDown={(e) => e.stopPropagation()} title={p.kind}
            className="rounded font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            {chainLabel(p)}
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
 *  (D-222). Shown whether or not the map's hatching is on; nothing for other sources. With no value,
 *  why not (issue #193). */
export function ReliabilityNote({ dataset, geoid, value, moe }: { dataset: Dataset; geoid: string; value?: number | null; moe?: number | null }) {
  if (value == null) return <p className="mt-1 text-xs text-muted-foreground" data-no-data-reason="">{noDataReason(dataset, geoid)}</p>;
  const note = isGradable(dataset.measure.kind) ? reliabilityNote(value, moe) : null;
  if (!note) return null;
  const range = moeRangeLine(value, moe, dataset.unit);
  return (
    <p className="mt-1 text-xs text-muted-foreground" data-reliability="">
      <span className="font-semibold text-foreground">{note.title}.</span> {note.body}
      {range && <span data-moe-range=""> {range}</span>}
    </p>
  );
}

/** A clicked place: its values, ranks and links (desktop panel; a BottomSheet on phones). */
/** A change map's card: the change, then both values, and "no clear change" when the difference is
 *  within its margin of error (√(MOE₁² + MOE₂²); see lib/change.ts). */
function ChangeCard({ dataset, geoid, change, to, sheetKey }: { dataset: Dataset; geoid: string; change: NonNullable<DetailProps["change"]>; to?: number; sheetKey: ReactNode }) {
  const from = change.fromValues?.[geoid];
  const c = change.classed.change?.[geoid];
  // The same test as the map's color and the hover card (D-545): the published margins of both periods.
  const steady = !!change.classed.tested && change.classed.classes.get(geoid) === (CHANGE_CLASSES - 1) / 2;
  const { headline } = changeSummary(c, from, to, change.classed.measure!, dataset.unit, steady, change.boundaryNote);
  return (
    <div className="rounded-md bg-muted px-3 py-2" data-change-card="">
      <p className="text-xs text-muted-foreground">{dataset.title}, change, {change.fromLabel} → {change.toLabel}</p>
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

export function DetailPanel({ info, top, onClose, primary, secondary, xv, yv, onMapIt, period, onPlace, legendKey, change, finest, onFlows }: DetailProps) {
  const [rows, setRows] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const phone = useIsPhone();
  /** "Compare with…" is waiting for a tap on the map: the phone drawer shrinks to the name and that prompt (issue #242). */
  const [picking, setPicking] = useState(false);
  const shrunk = phone && picking;
  /** Commute lines are on the map: the phone sheet drops to its short height so they show above it. */
  const [flowing, setFlowing] = useState(false);
  const flows = useCallback((lines: FeatureCollection | null) => { setFlowing(!!lines); onFlows?.(lines); }, [onFlows]);
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
    const shown = [primary, secondary].filter((d): d is Dataset => !!d);
    // The value the map drew and its margin file: for levels not in the database (D-124) and for
    // Library maps at state or county, which aren't in the click files (D-536).
    const fromMap = async (d: Dataset, i: number) => {
      const inTile = TILE_VALUE_LEVELS.has(info.level);
      const moes = inTile ? ({} as Values) : await loadMoes(d.id, info.level).catch(() => ({} as Values));
      // Blocks: the value is in the tile; 2020 Census counts have no margin of error.
      const fromTile = inTile && d.measure.kind === "census2020" ? (info.props?.[d.measure.value] as number | undefined) : undefined;
      return [d.id, { value: fromTile ?? (i === 0 ? xv : yv)?.[info.geoid] ?? null, moe: moes[info.geoid] ?? null }] as const;
    };
    const load = staticOnly
      ? Promise.all(shown.map(fromMap)).then((e) => Object.fromEntries(e) as Detail)
      // Tracts: only the maps on screen (one small file each, #371); the phone's full list loads its own.
      : Promise.all([fetchDetail(info.geoid, shown.map((d) => d.id)),
          ...shown.map((d, i) => (d.library && info.level !== "tract" ? fromMap(d, i) : null))])
          .then(([r, ...lib]) => ({ ...r, ...Object.fromEntries(lib.filter((e) => e != null)) }) as Detail);
    load.then((r) => live && setRows(r), (e) => live && setErr(String(e.message ?? e)));
    return () => { live = false; };
  }, [info.geoid, info.level, info.props, staticOnly, primary, secondary, xv, yv]);
  useEscape(onClose);

  const inside = useInside(info.geoid, info.level, info.lon, info.lat);
  const featured = [primary, secondary].filter((d): d is Dataset => !!d);
  const links = dedupe(featured.flatMap((d) => learnMoreLinks(d, { level: info.level, geoid: info.geoid, lon: info.lon, lat: info.lat })));
  const summary = (
    <>
      {!shrunk && <InsideLinks inside={inside} name={info.name} onPlace={onPlace} />}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold leading-snug">{info.name}</h2>
          <p className="text-xs text-muted-foreground" data-detail-level="">{GEO_LEVELS[info.level].label}{finest && " · the finest level on this map"}</p>
        </div>
        <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close details" className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <X className="size-4" />
        </button>
      </div>
      {shrunk ? null : err ? <StatusState status="error" message="Details are unavailable right now." />
        : !rows ? <StatusState status="loading" />
        : (
          <div className="space-y-2">
            {featured.map((d, i) => {
              const r = rows[d.id];
              if (i === 0 && change) {
                return <ChangeCard key={d.id} dataset={d} geoid={info.geoid} change={change} to={xv?.[info.geoid]}
                  sheetKey={phone && legendKey ? <SheetKey {...legendKey} /> : null} />;
              }
              if (i === 0 && period) {
                const v = xv?.[info.geoid];
                return (
                  <div key={d.id} className="rounded-md bg-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">{d.title}, {period.label}</p>
                    <p className="text-xl font-semibold tabular-nums">{formatValue(v, d.unit)}</p>
                    {!isRaceRow(d) && rankText(xv, v, info.level) && <p className="text-xs text-muted-foreground">{rankText(xv, v, info.level)}</p>}
                    {r?.value != null && <p className="mt-1 text-xs text-muted-foreground">{period.defaultLabel}: <span className="tabular-nums">{formatValue(r.value, d.unit)}</span></p>}
                  </div>
                );
              }
              const rank = isRaceRow(d) ? null : rankText(i === 0 ? xv : yv, r?.value, info.level);
              const est = formatEstimate(r?.value, r?.moe, d.unit);
              return (
                <div key={d.id} className="rounded-md bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">{d.title}</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {est.value}
                    {est.moe && <span className="ml-1 text-xs font-normal text-muted-foreground">±{est.moe}</span>}
                  </p>
                  {r?.value != null && <Benchmarks dataset={d} geoid={info.geoid} />}
                  {i === 0 && phone && legendKey && <SheetKey {...legendKey} />}
                  {rank &&<p className="mt-1 text-xs text-muted-foreground">{rank}</p>}
                  <ReliabilityNote dataset={d} geoid={info.geoid} value={r?.value} moe={r?.moe} />
                </div>
              );
            })}
          </div>
        )}
      <CompareWith geoid={info.geoid} level={info.level} name={info.name} dataset={primary} otherPeriod={!!period}
        aValue={!rows ? null : staticOnly ? undefined : rows[primary.id]?.value ?? null} onPicking={setPicking} />
      {!shrunk && info.level === "county" && onFlows && <CommuteFlows key={info.geoid} geoid={info.geoid} onLines={flows} />}
      {!shrunk && <LearnMore links={links} />}
      {phone && !shrunk && rows && !staticOnly && <p className="mt-2 text-center text-xs text-muted-foreground group-data-[snap=full]:hidden">Swipe up for all {info.level === "tract" ? TRACT_IDS.length : Object.keys(rows).filter((id) => !DATASET_BY_ID.get(id)?.library).length} datasets here</p>}
    </>
  );

  if (phone) {
    return (
      <BottomSheet label={`Details for ${info.name}`} summary={summary} onClose={onClose} collapsed={picking || flowing} lazy>
        {rows && !staticOnly && (
          <>
            {info.level === "tract"
              ? <AllTractData key={info.geoid} geoid={info.geoid} onMapIt={onMapIt} />
              : <PlaceDataList geoid={info.geoid} level={info.level} detail={rows} onMapIt={onMapIt} compact />}
            <a href={placeHref(info.geoid, primary.id)} className="mt-4 block text-sm font-medium text-primary underline-offset-2 hover:underline">Open the full place profile →</a>
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
        <a href={placeHref(info.geoid, primary.id)}
          className="mt-3 flex items-center justify-between rounded text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          Full place profile: all datasets for {info.name.split(",")[0]} <span aria-hidden>→</span>
        </a>
      )}
    </section>
  );
}

/** The phone sheet's list of every map for a tract: mounted on the first swipe up (BottomSheet
 *  `lazy`), so a tap loads only the maps on screen (#371). */
function AllTractData({ geoid, onMapIt }: { geoid: string; onMapIt: (id: string) => void }) {
  const [all, setAll] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetchDetail(geoid).then((d) => live && setAll(d), () => live && setFailed(true));
    return () => { live = false; };
  }, [geoid]);
  if (failed) return <StatusState status="error" message="Details are unavailable right now." />;
  if (!all) return <StatusState status="loading" />;
  return <PlaceDataList geoid={geoid} level="tract" detail={all} onMapIt={onMapIt} compact />;
}
