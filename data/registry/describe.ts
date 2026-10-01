// Plain-English "how this value is computed", shared by docs/data-sources.md and the
// website's dataset profile pages. Pure function of a registry entry (no Node APIs).
import type { DatasetEntry } from "./schema.ts";

export function describeMethod(e: DatasetEntry): string {
  const m = e.measure;
  if (m.kind === "acs5") {
    const sum = (v: string[]) => v.map((x) => `\`${x}\``).join(" + ");
    return `ACS 5-year API. ${m.denominator ? `(${sum(m.numerator)}) ÷ (${sum(m.denominator)})${m.scale !== 1 ? ` × ${m.scale}` : ""}` : sum(m.numerator)}${m.perSqMi ? " ÷ land area (sq mi)" : ""}. MOE: Census approximation formulas (${m.denominator ? (e.unit === "percent" ? "proportion" : "ratio") : m.numerator.length > 1 ? "sum" : "published"}).`;
  }
  if (m.kind === "lodes") return `LODES 8 ${m.file.toUpperCase()} \`${m.segment}_${m.jobType}\`, column \`${m.column}\`, blocks summed to tract/county/state${m.perSqMi ? ", ÷ land area (sq mi)" : ""}. Connecticut blocks remapped through \`ct_xwalk\` to planning-region geography.`;
  if (m.kind === "places") return `data.cdc.gov dataset \`${m.socrata}\`, measure \`${m.measureId}\`, \`${m.valueType}\`. The "MOE" column stores half the 95% confidence interval.`;
  if (m.kind === "ddp_287g") return `Deportation Data Project's 287(g) agreements table (compiled from every archived version of ICE's participating-agencies list): agreements with status ${m.statuses.join(" or ")}, counted by the participating agency's county (\`county_fips\`) and state. City police departments count in their county; state agencies and regional task forces count only toward their state.`;
  if (m.kind === "cejst") return `CEJST 2.0 communities file: residents of tracts where \`Identified as disadvantaged\` is true ÷ all residents, summed by the 2010 tract's state and county (CEJST's own tract population). Connecticut's 2010 counties don't match its 2022 planning regions, so its counties show no data.`;
  if (m.kind === "hpms_vmt") return `HPMS 2024 sections with AADT: Σ AADT × (end_point − begin_point) miles, grouped by state (from the layer name) and \`county_id\`, ${m.perCapita ? "÷ ACS population (population density × land area)" : ""}. Counted roads only, so it runs about 10–15% below FHWA's published totals, which estimate uncounted local roads (MN: 143M vs ≈163M vehicle-miles/day). Connecticut counties use pre-2022 codes and show no data.`;
  if (m.kind === "features") return `${m.geometry === "line" ? "Line" : "Point"} layer from \`${m.source.file}\` (layers matching \`${m.source.layerPattern}\`)${m.where ? `, where \`${m.where}\`` : ""}; colored by \`${m.valueField}\`${m.rank ? `, sized and thinned by \`${m.rank.field}\` (shown from zoom: ${m.rank.showUpTo.map(([z, v]) => `≤${v} at z${z}`).join(", ")})` : ""}. Built to PMTiles with tippecanoe; drawn from its own geometry, so it isn't part of county insights.`;
  if (m.kind === "nbi") return `FHWA NBI ${m.year} delimited highway-bridge file; share of ${m.weight === "deckArea" ? "deck area (the federal 23 CFR 490 measure)" : "bridges"} whose \`BRIDGE_CONDITION\` is ${m.condition}; areas with fewer than ${m.minBridges} bridges get no value. County codes are matched as published (Connecticut still uses pre-2022 counties, so its counties show no data).`;
  if (m.kind === "fars") return `NHTSA FARS accident files ${m.years[0]}–${m.years[1]}; deaths per crash (the \`FATALS\` field) summed by state/county, averaged per year, ÷ ACS population (population density × land area) × ${m.perPopulation.toLocaleString()}. Crashes with unknown county count toward the state only; Connecticut counties use pre-2022 codes and show no data.`;
  return `nClimDiv county file \`climdiv-${m.element}cy\`; ${m.stat} of months ${m.months.join(",")} per year, averaged over ${m.years[0]}–${m.years[1]} (a county needs ≥ 80% of years). NOAA state codes mapped to FIPS.`;
}


/** URL-safe slug for a source name, used to group and anchor sources. */
export function sourceSlug(name: string): string {
  return name.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}
