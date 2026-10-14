import { Popup } from "@webgis/design/components";
import { GEO_LEVELS, TILE_VALUE_LEVELS } from "@webgis/design";
import type { FeatureHit, HoverInfo } from "../map/MapView";
import type { Dataset } from "@/lib/registry";
import type { FeatureLayerSpec } from "@/lib/layers";
import type { LevelValues, Values } from "@/lib/values";
import { featureRows, featureTitle } from "./FeaturePanel";
import { changeSummary } from "@/lib/change";
import { areaChangeNote, type Stop } from "@/lib/periods";
import type { ClassedLevel } from "./useViewerData";
import { CHANGE_CLASSES } from "@webgis/design";

/** The hover card for a place (value for each mapped dataset), shown until something is clicked.
 *  On a change map it shows the change, with both periods' values under it. */
export function PlaceHoverPopup({ hover, primary, secondary, xValues, yValues, blockField, periodLabel, change }: {
  hover: HoverInfo;
  primary: Dataset;
  secondary: Dataset | null;
  xValues: LevelValues;
  yValues: LevelValues;
  /** Blocks carry their value as this tile property (2020 Census). */
  blockField?: string | null;
  /** The shown year stop's label, when it isn't the default period. */
  periodLabel?: string;
  /** A change map (issue #127): the two stops, the earlier values and the change classes. */
  change?: { from: Stop; to: Stop; fromValues?: Values; classed: ClassedLevel };
}) {
  if (change) {
    const g = hover.geoid;
    const tested = !!change.classed.tested && change.classed.classes.get(g) === (CHANGE_CLASSES - 1) / 2;
    const s = changeSummary(change.classed.change?.[g], change.fromValues?.[g], xValues[hover.level]?.[g], change.classed.measure!, primary.unit,
      tested, areaChangeNote(change.from, change.to, hover.level, g));
    return (
      <div className="pointer-events-none absolute z-30 rounded-md border bg-popover p-2.5 shadow-md" style={{ left: hover.x + 14, top: hover.y + 14 }} data-change-hover="">
        <Popup title={hover.name} subtitle={`${GEO_LEVELS[hover.level].label} · change, ${change.from.label} → ${change.to.label}`}
          rows={[]} lead={{ label: primary.title, text: s.headline }} footnote={s.values} />
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute z-30 rounded-md border bg-popover p-2.5 shadow-md" style={{ left: hover.x + 14, top: hover.y + 14 }}>
      <Popup title={hover.name} subtitle={`${GEO_LEVELS[hover.level].label}${periodLabel ? ` · ${periodLabel}` : ""}`}
        rows={[primary, secondary].filter((d) => !!d).map((d) => ({
          label: d!.title, unit: d!.unit,
          value: TILE_VALUE_LEVELS.has(hover.level) && blockField ? (hover.props?.[blockField] as number | undefined) : (d === primary ? xValues : yValues)[hover.level]?.[hover.geoid],
        }))} />
    </div>
  );
}

/** The hover card for a feature (e.g. a road segment): its title and first two fields. */
export function FeatureHoverPopup({ hit, spec, primary }: { hit: FeatureHit; spec: FeatureLayerSpec; primary: Dataset | null }) {
  return (
    <div className="pointer-events-none absolute z-30 rounded-md border bg-popover p-2.5 shadow-md" style={{ left: hit.x + 14, top: hit.y + 14 }}>
      <Popup title={featureTitle(hit, spec)} rows={featureRows(spec, hit, primary?.facets).slice(0, 2)} />
    </div>
  );
}
