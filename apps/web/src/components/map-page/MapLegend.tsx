import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BivariateLegend, Legend, StatusState } from "@webgis/design/components";
import { featureLineColors, formatValue, GEO_LEVELS, type GeoLevel, type ThemeName } from "@webgis/design";
import type { Dataset } from "@/lib/registry";
import type { FeatureLayerSpec } from "@/lib/layers";
import { changeNote, stopNote, type Stop } from "@/lib/periods";
import { changeUnitWords } from "@/lib/change";
import type { ClassedLevel } from "./useViewerData";

/** "< 2.5K vehicles/day" → "< 2.5K": the legend strip keeps the comparison and number, drops unit words. */
const stripEnd = (s: string) => s.replace(/^([<≥]\s*\S+).*$/, "$1");

/** Legend: full card on desktop; a strip on phones (tap to expand). Both carry `data-legend`, so
 *  the dock above can stop before it reaches them.
 *  The year control (D-36) lives in the filters panel (issue #34). */
export function MapLegend({ theme, primary, secondary, isFeature, featureSpec, current, error, available, loading, level, periodLabel, stop, stopId, since, desktopStrip, mark, covered, tableReady, onTable, hatchToggle }: {
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
  onTable: () => void;
  /** Reliability hatching (D-222): the toggle, only where the shown map can be graded. */
  hatchToggle?: { on: boolean; onChange: (on: boolean) => void; loading: boolean } | null;
}) {
  const [openPicked, setLegendOpen] = useState(false);
  const legendOpen = openPicked && !covered;
  // Line layers reverse their ramp on dark land (see featureLineColors); the legend follows the map.
  const featureColors = featureSpec && (featureSpec.geometry === "line" ? featureLineColors(featureSpec.colors, theme) : featureSpec.colors);
  const legendStrip = primary && (featureColors || current?.colors);
  const legendEnds = current?.ends ?? (featureSpec
    ? [`< ${formatValue(featureSpec.breaks[0], primary!.unit)}`, `≥ ${formatValue(featureSpec.breaks[featureSpec.breaks.length - 1], primary!.unit)}`]
    : current?.breaks?.length ? [`< ${formatValue(current.breaks[0], primary!.unit)}`, `≥ ${formatValue(current.breaks[current.breaks.length - 1], primary!.unit)}`] : null);
  const changeCaption = primary && since && stop && current?.measure && [
    `Change, ${since.label} → ${stop.label}, ${changeUnitWords(current.measure, primary.unit)} · ${GEO_LEVELS[level].label}`,
    current.tested && "No clear change: within the margin of error",
    primary.measure.kind === "acs5" && primary.unit === "dollars" && "Adjusted for inflation",
    changeNote(since, stop, level),
    primary.coverageNote,
  ].filter(Boolean).join(". ");
  const legendBody = (
    <>
      {primary && isFeature ? (featureSpec ? (
          <Legend title={primary.title} unit={primary.unit} colors={featureColors!} breaks={featureSpec.breaks} showNoData={false} swatch={featureSpec.geometry === "line" ? "line" : "area"}
            caption={`${primary.vintage} · ${featureSpec.featureCount.toLocaleString()} ${featureSpec.geometry === "line" ? "segments · wider lines = higher road class" : "areas"}${primary.coverageNote ? `. ${primary.coverageNote}` : ""}`} />
        ) : <StatusState status="empty" message="This layer hasn't been built yet." />)
        : error ? <StatusState status="error" message={error} />
        : primary && !available ? <StatusState status="empty" message="These two datasets don't share a geography level, so they can't be compared." />
        : loading ? <StatusState status="loading" message="Loading data…" />
        : primary && secondary && current?.xBreaks ? (
          <BivariateLegend xTitle={primary.title} yTitle={secondary.title} colors={current.colors} />
        ) : primary && current?.labels ? (
          <Legend title={primary.title} unit={primary.unit} colors={current.colors} breaks={[]} labels={current.labels} mark={mark}
            noDataFill="noDataChange" caption={changeCaption || undefined} />
        ) : primary && current?.breaks ? (
          <Legend title={primary.title} unit={primary.unit} colors={current.colors} breaks={current.breaks} minClass={current.minClass} mark={mark}
            caption={`${GEO_LEVELS[level].label} · ${periodLabel}${stop && stopNote(primary, stop, level) ? `. ${stopNote(primary, stop, level)}` : ""}${primary.coverageNote ? `. ${primary.coverageNote}` : ""}`} />
        ) : null}
      {hatchToggle && current?.breaks && !secondary && (
        <HatchToggle {...hatchToggle} fill={current.colors[Math.floor(current.colors.length / 2)]} />
      )}
    </>
  );

  return (
    <>
      {legendStrip && legendEnds && !legendOpen && (
        <button type="button" data-legend="" onClick={() => setLegendOpen(true)} aria-expanded={false} aria-label={`Show legend for ${primary!.title}`}
          className={`wg-panel absolute bottom-6 left-3 z-20 max-w-[calc(100%-9rem)] items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs tabular-nums text-foreground focus-visible:outline-2 focus-visible:outline-ring md:left-4 md:max-w-none ${desktopStrip ? "flex" : "flex md:hidden"}`}>
          {/* The strip is a compact key: numbers only ("< 2.5K", "≥ 75K"); the unit is in the full legend. */}
          {since ? <span className="font-semibold">Change</span> : stopId && <span className="font-semibold">{stop!.label}</span>}
          <span>{stripEnd(legendEnds[0])}</span>
          <span className="flex overflow-hidden rounded-sm" aria-hidden>
            {(secondary && current ? [current.colors[0], current.colors[4], current.colors[8]] : legendStrip).map((c, i) => <span key={i} className={featureSpec ? "h-1.5 w-4 self-center md:w-5" : "h-2 w-4 md:w-5"} style={{ background: c }} />)}
          </span>
          <span>{stripEnd(legendEnds[1])}</span>
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
            View as table{level !== "state" && level !== "county" ? " (counties)" : ""}
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
          {loading ? "Checking margins of error…" : "Hatched areas have a margin of error about half the estimate or more, so their color is a rough guide."}
        </p>
      )}
    </div>
  );
}
