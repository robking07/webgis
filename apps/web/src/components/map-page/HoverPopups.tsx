import { Popup } from "@webgis/design/components";
import { GEO_LEVELS } from "@webgis/design";
import type { FeatureHit, HoverInfo } from "../map/MapView";
import type { Dataset } from "@/lib/registry";
import type { FeatureLayerSpec } from "@/lib/layers";
import type { LevelValues } from "@/lib/values";
import { featureRows, featureTitle } from "./FeaturePanel";

/** The hover card for a place (value for each mapped dataset), shown until something is clicked. */
export function PlaceHoverPopup({ hover, primary, secondary, xValues, yValues, periodLabel }: {
  hover: HoverInfo;
  primary: Dataset;
  secondary: Dataset | null;
  xValues: LevelValues;
  yValues: LevelValues;
  /** The shown year stop's label, when it isn't the default period. */
  periodLabel?: string;
}) {
  return (
    <div className="pointer-events-none absolute z-30 rounded-md border bg-popover p-2.5 shadow-md" style={{ left: hover.x + 14, top: hover.y + 14 }}>
      <Popup title={hover.name} subtitle={`${GEO_LEVELS[hover.level].label}${periodLabel ? ` · ${periodLabel}` : ""}`}
        rows={[primary, secondary].filter((d) => !!d).map((d) => ({
          label: d!.title, unit: d!.unit,
          value: (d === primary ? xValues : yValues)[hover.level]?.[hover.geoid],
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
