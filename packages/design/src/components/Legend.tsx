import { classLabels, LEGEND, type Unit } from "../format.ts";
import type { NoDataFill } from "../style.ts";

export interface LegendProps {
  title: string;
  unit: Unit;
  colors: string[];
  breaks: number[];
  /** Vintage / source line under the title. */
  caption?: string;
  /** When set, the first class holds exactly this value and is labeled with it. */
  minClass?: number;
  /** Lines/points: features without a value aren't drawn, so there's no "No data" swatch. */
  showNoData?: boolean;
  /** Swatch shape: area fill (default) or a line sample. */
  swatch?: "area" | "line";
  /** Class index of a selected place: that row is outlined and labeled, so its value reads against the key. */
  mark?: number | null;
  /** Labels to show instead of ranges made from `breaks` (change maps, whose classes aren't ranges). */
  labels?: string[];
  /** Theme token for the no-data swatch (change maps have their own; see themes.ts). */
  noDataFill?: NoDataFill;
}

/** The only choropleth legend. Labels are text, so the legend never relies on color alone. */
export function Legend({ title, unit, colors, breaks, caption, minClass, showNoData = true, swatch = "area", mark = null, labels: given, noDataFill = "noData" }: LegendProps) {
  const labels = given ?? classLabels(breaks, unit, minClass != null ? { min: minClass, minIsClass: true } : undefined);
  return (
    <figure className="wg-legend" aria-label={`Legend: ${title}`}>
      <figcaption className="wg-legend-title">{title}</figcaption>
      {caption && <p className="wg-legend-caption">{caption}</p>}
      <ul className="wg-legend-list">
        {colors.map((c, i) => (
          <li key={c + i} className={mark === i ? "wg-legend-mark" : undefined} aria-current={mark === i ? "true" : undefined}>
            <span className={swatch === "line" ? "wg-swatch wg-swatch-line" : "wg-swatch"} style={{ background: c, width: LEGEND.swatchSize, height: swatch === "line" ? 4 + i : LEGEND.swatchSize }} aria-hidden />
            <span>{labels[i] ?? ""}</span>
            {mark === i && <span className="wg-legend-mark-label">◂ selected place</span>}
          </li>
        ))}
        {LEGEND.alwaysShowNoData && showNoData && (
          <li>
            <span className="wg-swatch wg-swatch-nodata" style={{ width: LEGEND.swatchSize, height: LEGEND.swatchSize, ...(noDataFill === "noDataChange" && { "--map-no-data": "var(--map-no-data-change)" }) }} aria-hidden />
            <span>{LEGEND.noDataLabel}</span>
          </li>
        )}
      </ul>
    </figure>
  );
}

export interface BivariateLegendProps {
  xTitle: string;
  yTitle: string;
  /** 9 colors, row-major, y low → high, x low → high. */
  colors: string[];
}

export function BivariateLegend({ xTitle, yTitle, colors }: BivariateLegendProps) {
  const rows = [2, 1, 0]; // draw high y at the top
  return (
    <figure className="wg-legend wg-legend-biv" aria-label={`Bivariate legend: ${xTitle} by ${yTitle}`}>
      <div className="wg-biv-grid" role="img" aria-label="3 by 3 grid; color darkens as both values rise">
        {rows.flatMap((r) => [0, 1, 2].map((c) => (
          <span key={`${r}${c}`} className="wg-swatch" style={{ background: colors[r * 3 + c] }} />
        )))}
      </div>
      <figcaption>
        <span className="wg-biv-x">{xTitle} →</span>
        <span className="wg-biv-y">{yTitle} →</span>
      </figcaption>
    </figure>
  );
}
