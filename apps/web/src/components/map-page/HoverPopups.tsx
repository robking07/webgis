import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Popup } from "@webgis/design/components";
import { formatValue, GEO_LEVELS, TILE_VALUE_LEVELS } from "@webgis/design";
import type { FeatureHit, HoverInfo } from "../map/MapView";
import type { Dataset } from "@/lib/registry";
import type { FeatureLayerSpec } from "@/lib/layers";
import type { LevelValues, Values } from "@/lib/values";
import { featureRows, featureTitle } from "./FeaturePanel";
import { changeSummary } from "@/lib/change";
import { areaChangeNote, type Stop } from "@/lib/periods";
import type { ClassedLevel } from "./useViewerData";
import { CHANGE_CLASSES } from "@webgis/design";

/** A period short enough to sit under a value: "2020–2024 (5-year estimate)" → "2020–2024", "2023 data" → "2023". */
const shortPeriod = (p: string) => p.replace(/ \(.*\)$/, "").replace(/ data$/, "");

/** The card beside the pointer. It flips to the pointer's other side when it would run past the
 *  map's right or bottom edge (a 390 px window clipped it, issue #236). */
function HoverCard({ x, y, children, ...rest }: { x: number; y: number; children: ReactNode; "data-change-hover"?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current, box = el?.offsetParent;
    if (!el || !box) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = `${x + 14 + w > box.clientWidth ? Math.max(4, x - 14 - w) : x + 14}px`;
    el.style.top = `${y + 14 + h > box.clientHeight ? Math.max(4, y - 14 - h) : y + 14}px`;
  });
  return (
    <div ref={ref} {...rest} className="pointer-events-none absolute z-30 rounded-md border bg-popover p-2.5 shadow-md" style={{ left: x + 14, top: y + 14 }}>
      {children}
    </div>
  );
}

/** The hover card for a place (value for each mapped dataset), shown until something is clicked.
 *  On a change map it shows the change, with both periods' values under it. */
export function PlaceHoverPopup({ hover, primary, secondary, xValues, yValues, blockField, periodLabel, change, unreliable }: {
  hover: HoverInfo;
  primary: Dataset;
  secondary: Dataset | null;
  xValues: LevelValues;
  yValues: LevelValues;
  /** Blocks carry their value as this tile property (2020 Census). */
  blockField?: string | null;
  /** The shown period (a year stop's label, or the dataset's vintage). */
  periodLabel: string;
  /** Hatching is on and this area's estimate is unreliable (D-222). */
  unreliable?: boolean;
  /** A change map (issue #127): the two stops, the earlier values and the change classes. */
  change?: { from: Stop; to: Stop; fromValues?: Values; classed: ClassedLevel };
}) {
  if (change) {
    const g = hover.geoid;
    const tested = !!change.classed.tested && change.classed.classes.get(g) === (CHANGE_CLASSES - 1) / 2;
    const s = changeSummary(change.classed.change?.[g], change.fromValues?.[g], xValues[hover.level]?.[g], change.classed.measure!, primary.unit,
      tested, areaChangeNote(change.from, change.to, hover.level, g));
    return (
      <HoverCard x={hover.x} y={hover.y} data-change-hover="">
        <Popup title={hover.name} subtitle={`${GEO_LEVELS[hover.level].label} · change`}
          rows={[]} lead={{ label: primary.title, text: s.headline,
            values: [{ value: s.values[0], period: change.from.label }, { value: s.values[1], period: change.to.label }] }} />
      </HoverCard>
    );
  }
  const valueOf = (d: Dataset) => TILE_VALUE_LEVELS.has(hover.level) && blockField ? (hover.props?.[blockField] as number | undefined) : (d === primary ? xValues : yValues)[hover.level]?.[hover.geoid];
  const v = valueOf(primary);
  // One map: its value is the headline, with its period under it. Two maps: each value with its own period.
  // shortcut: "unreliable" is only known while hatching is on (margins load then); show the margin itself if visitors ask.
  return (
    <HoverCard x={hover.x} y={hover.y}>
      <Popup title={hover.name} subtitle={GEO_LEVELS[hover.level].label}
        lead={secondary ? undefined : { label: primary.title, text: formatValue(v, primary.unit), period: shortPeriod(periodLabel), none: v == null }}
        rows={secondary ? [primary, secondary].map((d) => ({ label: d.title, unit: d.unit, value: valueOf(d), period: shortPeriod(d === primary ? periodLabel : d.vintage) })) : []}
        footnote={unreliable ? "Rough estimate: the margin of error is about half the value or more." : undefined} />
    </HoverCard>
  );
}

/** The hover card for a feature (e.g. a road segment): its title and first two fields. */
export function FeatureHoverPopup({ hit, spec, primary }: { hit: FeatureHit; spec: FeatureLayerSpec; primary: Dataset | null }) {
  // The mapped field leads (featureRows puts it first), with the dataset's period under it.
  const [main, next] = featureRows(spec, hit, primary?.facets);
  return (
    <HoverCard x={hit.x} y={hit.y}>
      <Popup title={featureTitle(hit, spec)}
        lead={main && { label: main.label, text: main.text ?? formatValue(main.value, main.unit), period: primary ? shortPeriod(primary.vintage) : undefined }}
        rows={next ? [next] : []} />
    </HoverCard>
  );
}
