import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SearchIcon } from "../SearchOverlay";
import { BivariateLegend, Legend, StatusState } from "@webgis/design/components";
import { featureLineColors, formatValue, GEO_LEVELS, legendFormat, type GeoLevel, type ThemeName } from "@webgis/design";
import type { Dataset } from "@/lib/registry";
import type { FeatureLayerSpec } from "@/lib/layers";
import { changeNote, stopNote, type Stop } from "@/lib/periods";
import { changeUnitWords } from "@/lib/change";
import { LEVEL_PLURAL } from "@/lib/place";
import type { ClassedLevel } from "./useViewerData";

/** "< 2.5K vehicles/day" → "< 2.5K": the legend strip keeps the comparison and number, drops unit words. */
const stripEnd = (s: string) => s.replace(/^([<≥]\s*\S+).*$/, "$1");

/** Legend: full card on desktop; a strip on phones (tap to expand). Both carry `data-legend`, so
 *  the dock above can stop before it reaches them.
 *  The year control (D-36) lives in the filters panel (issue #34). */
export function MapLegend({ theme, primary, secondary, isFeature, featureSpec, current, error, available, loading, level, periodLabel, stop, stopId, since, desktopStrip, mark, covered, tableReady, tableLevel, onTable, hatchToggle, onSearch }: {
  theme: ThemeName;
  primary: Dataset | null;
  secondary: Dataset | null;
  isFeature: boolean;
  featureSpec: FeatureLayerSpec | null;
  /** The classification at the shown level. */
  current: ClassedLevel | undefined;
  error: string | null | undefined;
  available: boolean;
  loading: boolean;
  level: GeoLevel;
  periodLabel: string;
  stop: Stop | null;
  stopId: string | null;
  /** Change map (issue #127): the earlier stop the change runs from. */
  since?: Stop | null;
  /** Desktop shows the strip only while the filters sidebar needs the room. */
  desktopStrip: boolean;
  /** Class index of the selected place, marked in the full legend. */
  mark?: number | null;
  /** Phones: a bottom sheet (details, table) is open, so the expanded legend folds back to its
   *  strip instead of peeking out above the sheet. */
  covered?: boolean;
  tableReady: boolean;
  /** The level the table lists; named on the button when it differs from the map's. */
  tableLevel: GeoLevel | null;
  onTable: () => void;
  /** Reliability hatching (D-222): the toggle, only where the shown map can be graded. */
  hatchToggle?: { on: boolean; onChange: (on: boolean) => void; loading: boolean } | null;
  /** Phones, zoomed in (issue #246): a search button just above the strip. It sits here because only
   *  the legend knows when the strip (not the taller full legend) is showing. */
  onSearch?: (() => void) | null;
}) {
  const [openPicked, setLegendOpen] = useState(false);
  const legendOpen = openPicked && !covered;
  // Each level has its own breaks, so when a zoom swaps the level and the key changes with it, the
  // legend flashes once (issue #325). Tracts and block groups share breaks, so that switch doesn't.
  const keyShown = current?.breaks ? `${level}|${current.breaks.join()}` : null;
  const [shown, setShown] = useState({ key: keyShown, cue: 0 });
  if (keyShown && keyShown !== shown.key) {
    const [was, wasBreaks] = shown.key?.split("|") ?? [];
    setShown({ key: keyShown, cue: shown.cue + (was && was !== level && wasBreaks !== current!.breaks!.join() ? 1 : 0) });
  }
  const cueClass = shown.cue ? "wg-legend-cue" : "";
  // Line layers reverse their ramp on dark land (see featureLineColors); the legend follows the map.
  const featureColors = featureSpec && (featureSpec.geometry === "line" ? featureLineColors(featureSpec.colors, theme) : featureSpec.colors);
  const legendStrip = primary && (featureColors || current?.colors);
  const legendEnds = current?.ends ?? (featureSpec
    ? [`< ${formatValue(featureSpec.breaks[0], primary!.unit)}`, `≥ ${formatValue(featureSpec.breaks[featureSpec.breaks.length - 1], primary!.unit)}`]
    : current?.breaks?.length ? ((f) => [`< ${f(current.breaks![0])}`, `≥ ${f(current.breaks!.at(-1)!)}`])(legendFormat(current.breaks, primary!.unit)) : null);
  // Long method notes sit behind "About this scale" so the swatches stay on screen (#187).
  const [changeHead, ...changeNotes] = primary && since && stop && current?.measure ? [
    `Change, ${since.label} → ${stop.label}, ${changeUnitWords(current.measure, primary.unit)} · ${GEO_LEVELS[level].label}`,
    current.tested && "No clear change: within the margin of error",
    primary.measure.kind === "acs5" && primary.unit === "dollars" && "Adjusted for inflation",
    changeNote(since, stop, level),
    primary.coverageNote,
  ].filter(Boolean) as string[] : [];
  const stopText = primary && stop && stopNote(primary, stop, level);
  const notes = (isFeature ? [primary?.coverageNote] : changeHead ? changeNotes : [stopText, primary?.coverageNote]).filter(Boolean).join(". ");
  const legendBody = (
    <div key={shown.cue} className={cueClass}>
      {primary && isFeature ? (featureSpec ? (
          <Legend title={primary.title} unit={primary.unit} colors={featureColors!} breaks={featureSpec.breaks} showNoData={false} swatch={featureSpec.geometry === "line" ? "line" : "area"}
            caption={`${primary.vintage} · ${featureSpec.featureCount.toLocaleString()} ${featureSpec.geometry === "line" ? `${(primary.measure.kind === "features" && primary.measure.noun || "Features").toLowerCase()}${featureSpec.rankField ? " · wider lines = higher road class" : ""}` : "areas"}`} />
        ) : <StatusState status="empty" message="This layer hasn't been built yet." />)
        : error ? <StatusState status="error" message={error} />
        : primary && !available ? <StatusState status="empty" message="These two datasets don't share a geography level, so they can't be compared." />
        : loading ? <StatusState status="loading" message="Loading data…" />
        : primary && secondary && current?.xBreaks ? (
          <BivariateLegend xTitle={primary.title} yTitle={secondary.title} colors={current.colors} />
        ) : primary && current?.labels ? (
          <Legend title={primary.title} unit={primary.unit} colors={current.colors} breaks={[]} labels={current.labels} mark={mark}
            noDataFill="noDataChange" caption={changeHead} />
        ) : primary && current?.breaks ? (<>
          <Legend title={primary.title} unit={primary.unit} colors={current.colors} breaks={current.breaks} minClass={current.minClass} mark={mark}
            caption={`${GEO_LEVELS[level].label} · ${periodLabel}`} />
          {current.fitted && <p className="mt-1 text-xs text-muted-foreground" data-fitted="">Colors fit the counties in view</p>}
        </>) : null}
      {notes && !secondary && !error && !loading && (
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer rounded text-primary focus-visible:outline-2 focus-visible:outline-ring">About this scale</summary>
          <p className="mt-1">{notes}</p>
        </details>
      )}
      {hatchToggle && current?.breaks && !secondary && (
        <HatchToggle {...hatchToggle} fill={current.colors[Math.floor(current.colors.length / 2)]} />
      )}
    </div>
  );

  return (
    <>
      {legendStrip && legendEnds && !legendOpen && (
        <button key={shown.cue} type="button" data-legend="" onClick={() => setLegendOpen(true)} aria-expanded={false}
          className={`wg-panel absolute bottom-6 left-3 z-20 max-w-[calc(100%-9rem)] items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs tabular-nums text-foreground focus-visible:outline-2 focus-visible:outline-ring md:left-4 md:max-w-none ${desktopStrip ? "flex" : "flex md:hidden"} ${cueClass}`}>
          {/* The strip is a compact key: numbers only ("< 2.5K", "≥ 75K"); the unit is in the full legend. */}
          {/* Name = this text + the visible ends, so the visible label is part of it (WCAG 2.5.3). */}
          <span className="sr-only">Show legend for {primary!.title}</span>
          {since ? <span className="font-semibold">Change</span> : stopId && <span className="font-semibold">{stop!.label}</span>}
          <span>{stripEnd(legendEnds[0])}</span>
          <span className="flex overflow-hidden rounded-sm" aria-hidden>
            {(secondary && current ? [current.colors[0], current.colors[4], current.colors[8]] : legendStrip).map((c, i) => <span key={i} className={featureSpec ? "h-1.5 w-4 self-center md:w-5" : "h-2 w-4 md:w-5"} style={{ background: c }} />)}
          </span>
          <span>{stripEnd(legendEnds[1])}</span>
        </button>
      )}
      {onSearch && legendStrip && legendEnds && !legendOpen && (
        // shortcut: hidden while the full legend shows (expanded, or no strip yet); fine while the strip is the phone default.
        <button type="button" onClick={onSearch} aria-label="Search places and datasets" title="Search places and datasets"
          className="wg-panel wg-zbtn absolute bottom-[66px] left-3 z-20 grid size-11 place-items-center rounded-[14px] text-foreground focus-visible:outline-2 focus-visible:outline-ring md:hidden">
          <SearchIcon />
        </button>
      )}
      <section aria-label="Legend" data-legend=""
        className={`absolute bottom-6 left-3 right-3 z-20 max-h-[55%] overflow-y-auto rounded-lg border bg-card p-3 shadow-sm md:left-4 md:right-auto md:max-h-[60%] md:w-64 ${legendOpen || !(legendStrip && legendEnds) ? "block" : desktopStrip ? "hidden" : "hidden md:block"}`}>
        {legendOpen && (
          <button type="button" onClick={() => setLegendOpen(false)} aria-label="Collapse legend"
            className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <ChevronDown className="size-4" />
          </button>
        )}
        {legendBody}
        {tableReady && (
          <button type="button" onClick={onTable}
            className="mt-2 rounded text-xs text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            View as table{tableLevel && tableLevel !== level ? ` (${LEVEL_PLURAL[tableLevel]})` : ""}
          </button>
        )}
      </section>
    </>
  );
}

/** The reliability entry (D-222): a hatched swatch over a mid class color (the color still shows),
 *  a switch, and, once on, what the hatching means in plain words. */
function HatchToggle({ on, onChange, loading, fill }: { on: boolean; onChange: (on: boolean) => void; loading: boolean; fill: string }) {
  return (
    <div className="mt-2 border-t pt-2 text-xs">
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} data-hatch-toggle=""
          className="size-3.5 accent-primary focus-visible:outline-2 focus-visible:outline-ring" />
        <span className="wg-swatch wg-swatch-hatch" style={{ backgroundColor: fill, width: 16, height: 16 }} aria-hidden />
        <span>Hatch unreliable estimates</span>
      </label>
      {on && (
        <p className="mt-1 text-muted-foreground" aria-live="polite">
          {loading ? "Checking margins of error…" : "Hatched areas have a margin of error about half the estimate or more (or are zero with a wide margin), so their color is a rough guide."}
        </p>
      )}
    </div>
  );
}
