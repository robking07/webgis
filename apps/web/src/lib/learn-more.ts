// Popup links that help a reader understand one data point (D-35): a readable profile of
// the place, the source's own explainer, or the place itself (Street View). Templates live in
// each registry entry's `learnMore`; this only fills in the placeholders.
import type { GeoLevel } from "@webgis/design";
import type { Dataset } from "./registry";

/** Census Reporter / data.census.gov summary-level prefixes. */
const SUMLEV: Record<GeoLevel, string> = { state: "04000US", county: "05000US", tract: "14000US", block_group: "15000US", block: "10000US" };

export interface LinkContext {
  level?: GeoLevel;
  geoid?: string;
  lon?: number;
  lat?: number;
  /** Feature-layer properties, for {field} placeholders. */
  props?: Record<string, unknown>;
}

export interface Link { label: string; url: string }

export function learnMoreLinks(d: Dataset, ctx: LinkContext): Link[] {
  const vars: Record<string, string> = {};
  if (ctx.level && ctx.geoid) Object.assign(vars, { level: ctx.level, geoid: ctx.geoid, cr: `${SUMLEV[ctx.level]}${ctx.geoid}` });
  if (ctx.lon != null && ctx.lat != null) Object.assign(vars, { lon: ctx.lon.toFixed(5), lat: ctx.lat.toFixed(5) });
  for (const [k, v] of Object.entries(ctx.props ?? {})) if (v != null && v !== "") vars[k] ??= String(v);
  const out: Link[] = [];
  for (const l of d.learnMore ?? []) {
    if (l.levels && (!ctx.level || !l.levels.includes(ctx.level))) continue;
    let missing = false;
    const url = l.url.replace(/\{(\w+)\}/g, (_, k: string) => {
      if (vars[k] == null) missing = true;
      return encodeURIComponent(vars[k] ?? "");
    });
    if (!missing) out.push({ label: l.label, url });
  }
  return out;
}
