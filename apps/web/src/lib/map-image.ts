// "Save image" (issue #361): the map as drawn, with a title band above, the legend in its corner and
// the source, access date and basemap credit below. Colors come from the theme tokens.
import { classLabels, featureLineColors, THEMES, type ThemeName, type Unit } from "@webgis/design";
import { accessDate } from "./cite";

/** Class colors and their labels, or a 3×3 bivariate grid (`grid`, with the two map titles). */
export interface ImageLegend {
  colors: string[];
  labels?: string[];
  grid?: { x: string; y: string };
  noData?: string;
}

/** The image's legend, picked the way MapLegend picks the on-screen one. */
export function imageLegend({ theme, unit, current, feature, biv }: {
  theme: ThemeName;
  unit: Unit;
  current?: { colors: string[]; breaks?: number[]; xBreaks?: number[]; labels?: string[]; minClass?: number };
  feature?: { colors: string[]; breaks: number[]; geometry: string } | null;
  /** Two maps compared: their titles. */
  biv?: { x: string; y: string } | null;
}): ImageLegend | null {
  const { noData, noDataChange } = THEMES[theme].map;
  if (feature) return { colors: feature.geometry === "line" ? featureLineColors(feature.colors, theme) : feature.colors, labels: classLabels(feature.breaks, unit) };
  if (!current) return null;
  if (biv && current.xBreaks) return { colors: current.colors, grid: biv };
  if (current.labels) return { colors: current.colors, labels: current.labels, noData: noDataChange };
  if (current.breaks) return { colors: current.colors, labels: classLabels(current.breaks, unit, current.minClass != null ? { min: current.minClass, minIsClass: true } : undefined), noData };
  return null;
}

const PAD = 12, SW = 14, ROW = 20, LEGEND_W = 210;

/** Greedy word wrap to `w` px in the context's current font. */
function wrap(ctx: CanvasRenderingContext2D, text: string, w: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > w) { lines.push(line); line = word; } else line = next;
  }
  return line ? [...lines, line] : lines;
}

export function mapImage({ map, theme, title, legend, sources, date }: {
  /** A copy of the map canvas, at the device pixel ratio. */
  map: HTMLCanvasElement;
  theme: ThemeName;
  title: string;
  legend: ImageLegend | null;
  sources: string;
  date: Date;
}): Promise<Blob | null> {
  const { ui } = THEMES[theme];
  const s = window.devicePixelRatio || 1;
  const W = map.width / s, H = map.height / s;
  const family = getComputedStyle(document.body).fontFamily;
  const font = (px: number, bold = false) => `${bold ? "600 " : ""}${px}px ${family}`;
  const out = document.createElement("canvas");
  const ctx = out.getContext("2d")!;

  // Measure first: the bands grow with the wrapped text.
  ctx.font = font(16, true);
  const titleLines = wrap(ctx, title, W - 2 * PAD);
  ctx.font = font(11);
  const foot = [
    ...wrap(ctx, `Source: ${sources}`, W - 2 * PAD),
    `Mapped by Mapwich (mapwich.org) · accessed ${accessDate(date)}`,
    "Boundaries: U.S. Census Bureau · Basemap: OpenFreeMap © OpenMapTiles © OpenStreetMap contributors",
  ].flatMap((l) => wrap(ctx, l, W - 2 * PAD));
  const top = PAD * 2 + titleLines.length * 20;
  const footH = PAD * 2 + foot.length * 15;

  out.width = Math.round(W * s);
  out.height = Math.round((top + H + footH) * s);
  ctx.scale(s, s);
  ctx.fillStyle = ui.bg;
  ctx.fillRect(0, 0, W, top + H + footH);
  ctx.drawImage(map, 0, top, W, H);
  ctx.textBaseline = "top";

  ctx.fillStyle = ui.text;
  ctx.font = font(16, true);
  titleLines.forEach((l, i) => ctx.fillText(l, PAD, PAD + i * 20));

  ctx.fillStyle = ui.textMuted;
  ctx.font = font(11);
  foot.forEach((l, i) => ctx.fillText(l, PAD, top + H + PAD + i * 15));

  if (legend) {
    const rows = legend.grid ? [] : legend.colors.map((c, i) => [c, legend.labels?.[i] ?? ""]);
    if (legend.noData) rows.push([legend.noData, "No data"]);
    const boxW = Math.min(LEGEND_W, W - 2 * PAD);
    const boxH = PAD * 2 + (legend.grid ? 3 * SW + 2 * ROW : 0) + rows.length * ROW;
    const x = PAD, y = top + H - PAD - boxH;
    ctx.fillStyle = ui.surface;
    ctx.strokeStyle = ui.border;
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeRect(x + 0.5, y + 0.5, boxW - 1, boxH - 1);
    ctx.font = font(12);
    let ry = y + PAD;
    if (legend.grid) {
      // colors[y * 3 + x], as in BivariateLegend: high y draws at the top.
      ctx.fillStyle = ui.text;
      ctx.fillText(`↑ ${legend.grid.y}`, x + PAD, ry, boxW - 2 * PAD);
      ry += ROW;
      legend.colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x + PAD + (i % 3) * SW, ry + (2 - Math.floor(i / 3)) * SW, SW, SW); });
      ry += 3 * SW + 4;
      ctx.fillStyle = ui.text;
      ctx.fillText(`${legend.grid.x} →`, x + PAD, ry, boxW - 2 * PAD);
      ry += ROW - 4;
    }
    for (const [c, label] of rows) {
      ctx.fillStyle = c;
      ctx.fillRect(x + PAD, ry + 1, SW, SW);
      ctx.fillStyle = ui.text;
      ctx.fillText(label, x + PAD + SW + 8, ry + 2, boxW - 3 * PAD - SW);
      ry += ROW;
    }
  }
  return new Promise((resolve) => out.toBlob(resolve, "image/png"));
}
