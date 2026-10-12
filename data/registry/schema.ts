// Dataset registry schema. One YAML file per dataset in ./datasets. Adding a dataset
// means adding a file here (and, for a new source type, an ingest script) — never UI code.
import { z } from "zod";

const Ramp = z.enum(["blues", "ylgnbu", "oranges", "purples", "viridis", "cividis", "rdbu", "puor", "brbg"]);
const Unit = z.enum(["dollars", "percent", "minutes", "count", "per_sq_mi", "ratio", "years", "deg_f", "inches", "per_100k", "vehicles_per_day", "miles_per_day", "categories", "agreements", "percentile", "ug_m3", "ppm", "degree_days"]);
export const GeoLevel = z.enum(["state", "county", "tract", "block_group", "block"]);

/** A feature-layer popup field with optional explainers (D-35). */
const FeatureField = z.object({
  label: z.string(),
  unit: z.string().optional(),
  explainer: z.string().optional(),
  url: z.url().optional(),
  items: z.record(z.string(), z.object({ description: z.string(), url: z.url().optional() })).optional(),
});

/** How the value is computed from source variables. */
const AcsMeasure = z.object({
  kind: z.literal("acs5"),
  /** Variables summed for the numerator, e.g. ["B08301_010"]. Estimates (E) and MOEs (M) are fetched for each. */
  numerator: z.array(z.string().regex(/^[BC]\d{5}[A-Z]?_\d{3}$/)).min(1),
  /** Variables summed for the denominator. Omit for a direct estimate (e.g. a median). */
  denominator: z.array(z.string().regex(/^[BC]\d{5}[A-Z]?_\d{3}$/)).optional(),
  /** Multiply the ratio by this (100 for percent). */
  scale: z.number().default(1),
  /** Divide by land area to get a density. */
  perSqMi: z.boolean().default(false),
  /** Same measure from tables the Census Bureau publishes at block-group level, when the
   *  main tables stop at tracts (e.g. poverty: B17001 → C17002). */
  blockGroup: z.object({
    numerator: z.array(z.string().regex(/^[BC]\d{5}[A-Z]?_\d{3}$/)).min(1),
    denominator: z.array(z.string().regex(/^[BC]\d{5}[A-Z]?_\d{3}$/)).optional(),
  }).optional(),
});
/** 2020 Census counts (P.L. 94-171), built from blocks up so every level adds up (D-124).
 *  One ingest computes every `value`; block values live in the block tiles. */
const Census2020Measure = z.object({
  kind: z.literal("census2020"),
  value: z.enum(["pop_density", "hu_density", "pct_vacant"]),
});
const LodesMeasure = z.object({
  kind: z.literal("lodes"),
  /** LODES WAC/RAC column, e.g. C000 = total jobs. */
  column: z.string(),
  file: z.enum(["wac", "rac"]),
  segment: z.string().default("S000"),
  jobType: z.string().default("JT00"),
  /** Divide by land area to get a density. */
  perSqMi: z.boolean().default(false),
});

const PlacesMeasure = z.object({
  kind: z.literal("places"),
  /** Socrata dataset id on data.cdc.gov, e.g. swc5-untb (PLACES 2025 county release). */
  socrata: z.string(),
  measureId: z.string(),
  valueType: z.enum(["AgeAdjPrv", "CrdPrv"]).default("AgeAdjPrv"),
});
const ClimdivMeasure = z.object({
  kind: z.literal("climdiv"),
  /** NOAA nClimDiv county element file: tmpc (mean temp), tmax, tmin, pcpn (precipitation),
   *  hddc / cddc (heating / cooling degree days). */
  element: z.enum(["tmpc", "tmax", "tmin", "pcpn", "hddc", "cddc"]),
  /** Months (1–12) included. */
  months: z.array(z.number().int().min(1).max(12)).min(1),
  /** mean of the monthly values, or their sum (precipitation totals). */
  stat: z.enum(["mean", "sum"]),
  /** Inclusive normals period. */
  years: z.tuple([z.number().int(), z.number().int()]),
});

const NbiMeasure = z.object({
  kind: z.literal("nbi"),
  /** NBI release year (FHWA delimited highway-bridge file). */
  year: z.number().int(),
  /** Share of deck area (FHWA performance measure) or of bridge count in the given condition. */
  weight: z.enum(["deckArea", "count"]),
  condition: z.enum(["P", "F", "G"]),
  /** Areas with fewer bridges than this get no value (too few to be meaningful). */
  minBridges: z.number().int().default(10),
});
const FarsMeasure = z.object({
  kind: z.literal("fars"),
  /** Inclusive range of FARS years; the value is the annual average. */
  years: z.tuple([z.number().int(), z.number().int()]),
  /** Divide by population (from the population_density dataset × land area) per this many people. */
  perPopulation: z.number().default(100000),
});

/** EPA air quality design values (public workbooks, no key): the design value of the highest valid
 *  monitor in each county, from the county-status sheet. Counties with no valid monitor are absent. */
const AirQualityMeasure = z.object({
  kind: z.literal("airquality"),
  /** The pollutant's design-value workbook (.xlsx) on epa.gov. */
  url: z.url(),
  /** County-status sheet name inside the workbook. */
  sheet: z.string(),
  /** Design-value period as printed in the column header, e.g. "2023-2025". */
  period: z.string(),
});

/** CDC/NCHS VSRR provisional county drug overdose deaths: 12-month-ending counts from data.cdc.gov,
 *  suppressed (1-9 deaths) counties get no value; rate = deaths ÷ ACS population × `perPopulation`. */
const OverdoseMeasure = z.object({
  kind: z.literal("overdose"),
  /** Socrata dataset id on data.cdc.gov. */
  socrata: z.string(),
  /** The headline period is the 12 months ending in this month of this year. */
  endYear: z.number().int(),
  endMonth: z.number().int().min(1).max(12).default(12),
  perPopulation: z.number().default(100000),
});

/** Deportation Data Project 287(g) agreements (CC0): active agreements counted by the
 *  agencies' county and state FIPS. */
const Ddp287gMeasure = z.object({
  kind: z.literal("ddp_287g"),
  url: z.url(),
  file: z.string(),
  /** Agreement statuses counted (e.g. ["Active"]). */
  statuses: z.array(z.string()).min(1),
});

/** CEJST (Justice40) roll-up: share of residents living in tracts identified as disadvantaged,
 *  by state and county, from the CEJST 2.0 communities CSV (2010 tracts). */
const CejstMeasure = z.object({
  kind: z.literal("cejst"),
  url: z.url(),
  file: z.string(),
});

/** FEMA National Risk Index: one field of FEMA's county and tract layers (public ArcGIS
 *  FeatureServer, no key). Ingest: data/ingest/src/nri.ts. */
const FemaNriMeasure = z.object({
  kind: z.literal("fema_nri"),
  /** NRI version the entry was written for, as in the layers' NRI_VER field ("December 2025").
   *  Ingest stops if FEMA has moved the layers to another version. */
  version: z.string(),
  /** NRI field, the same name in the county and tract layers (e.g. RISK_SCORE, EAL_VALT, WFIR_EALT). */
  field: z.string().regex(/^[A-Z][A-Z_]*$/),
  /** Divide by the NRI's POPULATION field (e.g. dollars of expected loss per resident). */
  perCapita: z.boolean().default(false),
  /** Per-capita values only: tracts with fewer residents than this get no value (port, airport
   *  and park tracts with a handful of residents would otherwise show huge per-person figures). */
  minTractPopulation: z.number().int().min(1).default(100),
  /** Rating field: a blank value rated "Not Applicable" (the hazard isn't possible there) counts
   *  as 0 instead of no data. Blanks rated "Insufficient Data" stay no data. */
  ratingField: z.string().regex(/^[A-Z][A-Z_]*$/).optional(),
});

/** Daily vehicle miles traveled from HPMS: Σ AADT × section length (milepoints), by county,
 *  divided by residents. Counted roads only; uncounted local roads are missing. */
const HpmsVmtMeasure = z.object({
  kind: z.literal("hpms_vmt"),
  source: z.object({ url: z.url(), file: z.string(), path: z.string(), layerPattern: z.string() }),
  perCapita: z.boolean().default(true),
});

/** DOE Low-Income Energy Affordability Data (LEAD Tool; OEDI, CC BY 4.0): modelled household energy
 *  costs and incomes, summed from the per-state tract files up to county and state. */
const LeadMeasure = z.object({
  kind: z.literal("lead"),
  /** Per-state zip URL with `{ST}` for the postal code. */
  url: z.string().includes("{ST}"),
  year: z.number().int(),
  /** Income grouping file: Area Median Income, Federal Poverty Level, State Median Income, Lower Living Standard. */
  grouping: z.enum(["AMI", "FPL", "SMI", "LLSI"]),
  /** Income bands to include, as printed in the file (e.g. "0-30%"); empty = all households. */
  bands: z.array(z.string()).default([]),
  /** burden = average energy cost ÷ average income (percent); cost = average annual energy cost (dollars). */
  stat: z.enum(["burden", "cost"]),
  /** Tracts with fewer households than this in the group get no value. */
  minHouseholds: z.number().default(0),
});

/** USDA ERS Food Access Research Atlas (public domain): a tract count column summed to county and
 *  state, ÷ a tract total column. 2010 tracts, rolled up by their 2010 county code. */
const FoodAccessMeasure = z.object({
  kind: z.literal("food_access"),
  url: z.url(),
  file: z.string(),
  /** CSV inside the zip. */
  entry: z.string(),
  /** Tract column counted (a "NULL" count means no one beyond the distance: 0). */
  count: z.string(),
  /** Rural tracts' count column, when it differs (`count: lapop1` + `ruralCount: lapop10` is the
   *  1-mile urban / 10-mile rural count; USDA's combined LAPOP1_10 is blank in four tracts of renamed counties). */
  ruralCount: z.string().optional(),
  /** Count only tracts where this 0/1 flag column is 1 (e.g. residents of flagged tracts). */
  flag: z.string().optional(),
  /** Tract total the count is divided by (Pop2010, OHU2010). */
  per: z.string(),
});

/** A layer drawn from its own geometry (road segments, stops, bridges…) instead of a
 *  choropleth on Census geography. Values live in the tiles; breaks are computed at ingest. */
const FeaturesMeasure = z.object({
  kind: z.literal("features"),
  geometry: z.enum(["line", "point", "polygon"]),
  source: z.object({
    /** Download URL (cached in data/cache). */
    url: z.url(),
    /** File name to cache it as. */
    file: z.string(),
    /** Path inside the downloaded zip to the GDAL dataset (e.g. "HPMS2024.gdb"). */
    path: z.string(),
    /** Regex matching the GDAL layer(s) to read; HPMS ships one layer per state. */
    layerPattern: z.string(),
  }),
  /** A table to join in `select` as the layer `join` (e.g. a CSV of tract values for tract shapes). */
  join: z.object({ url: z.url(), file: z.string(), path: z.string() }).optional(),
  /** OGR SQL WHERE clause applied while extracting (e.g. "AADT > 0"). Ignored when `select` is set. */
  where: z.string().optional(),
  /** SQLite-dialect SELECT run per source layer, for derived readable fields (e.g. route labels).
   *  Placeholders: {layer} (source layer name), {state} (USPS code parsed from the layer name).
   *  Must select the geometry column. Overrides `where`; `fields` still lists what's kept. */
  select: z.string().optional(),
  /** Numeric field that drives color. */
  valueField: z.string(),
  /** Source field → popup label (or {label, unit, …}). Only these fields are kept in the tiles.
   *  `explainer`/`url`: a plain-language note and a page that explains the field.
   *  `items`: for comma-separated list fields, each item's explainer and link (e.g. CEJST burdens). */
  fields: z.record(z.string(), z.union([z.string(), FeatureField])),
  /** Ordinal field for importance (lower = more important, e.g. functional class) used for
   *  line width and for thinning at low zoom: at zoom ≥ z, show features with field ≤ max. */
  rank: z.object({ field: z.string(), showUpTo: z.array(z.tuple([z.number(), z.number()])).min(1) }).optional(),
  /** Tile zoom range. */
  zooms: z.tuple([z.number().int(), z.number().int()]).default([3, 12]),
});

/** One popup link that helps a reader understand a data point, not just the metadata.
 *  Placeholders: {geoid}, {level}, {cr} (Census Reporter id, e.g. 05000US27053) for areas;
 *  {lat}, {lon} (the clicked point) and any {field} of a feature layer. */
export const LearnMore = z.object({
  label: z.string(),
  url: z.string(),
  /** Only offer it at these levels (areas). Omitted = every level. */
  levels: z.array(GeoLevel).optional(),
});

/** A categorical field people can filter by, with a plain-language explainer (D-26). */
export const Facet = z.object({
  field: z.string(),
  label: z.string(),
  /** One or two sentences a non-specialist can follow. */
  explainer: z.string(),
  /** Glossary term id with the longer explanation, if any. */
  term: z.string().optional(),
  values: z.array(z.object({
    value: z.union([z.string(), z.number()]),
    label: z.string(),
    description: z.string().optional(),
  })).min(2),
});

export const DatasetEntry = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  title: z.string(),
  /**
   * Plain noun phrase that reads after "higher" / "lower" in Odd Pairings captions,
   * e.g. "work-from-home rates", "household incomes". Falls back to the title.
   */
  phrase: z.string().optional(),
  /** One sentence shown in the browser and popups. */
  description: z.string(),
  category: z.enum(["Income & poverty", "Commuting", "Vehicles", "Housing", "Population", "Jobs", "Transportation", "Environment", "Environmental justice", "Immigration enforcement", "Health", "Climate", "Race & ethnicity", "Education", "Internet access"]),
  tags: z.array(z.string()).default([]),
  source: z.object({
    name: z.string(),
    /** A few words for the map card's one-line meta ("Census Bureau", "CDC PLACES"), so it never
     *  wraps on a phone (issue #34). Falls back to `name` up to its first comma or parenthesis. */
    shortName: z.string().max(24).optional(),
    url: z.url(),
    citation: z.string(),
  }),
  license: z.string(),
  updateCadence: z.enum(["annual", "quarterly", "monthly", "irregular", "static"]),
  vintage: z.string(),
  /** Census levels a choropleth dataset has. Empty for `features` layers. */
  geographyLevels: z.array(GeoLevel).default([]),
  unit: Unit,
  /** For insights: the population the value describes. Pairs that share one are flagged. */
  universe: z.string(),
  measure: z.discriminatedUnion("kind", [AcsMeasure, Census2020Measure, LodesMeasure, PlacesMeasure, ClimdivMeasure, NbiMeasure, FarsMeasure, FeaturesMeasure, HpmsVmtMeasure, CejstMeasure, Ddp287gMeasure, LeadMeasure, FoodAccessMeasure, FemaNriMeasure, AirQualityMeasure, OverdoseMeasure]),
  /** Other registry datasets used as inputs to this dataset's model (e.g. PLACES uses county poverty).
   *  Insight pairs with these are flagged: they correlate partly by construction. */
  modelInputs: z.array(z.string()).default([]),
  /** Known coverage gaps, shown in the legend caption and data-sources doc. */
  coverageNote: z.string().optional(),
  /** Filterable categorical fields (feature layers), each with an explainer. */
  facets: z.array(Facet).default([]),
  /** Keep out of Odd Pairings (Specials)' playful pairings (sensitive subjects, e.g. enforcement). */
  excludeFromInsights: z.boolean().default(false),
  /** Earlier (or later) moments the map can step through (D-36), `from`…`to` by `step`. The
   *  headline `vintage` stays the default and is what comparisons and Odd Pairings use.
   *  acs5: 5-year periods named by their last year (2014 = 2010–2014; use step 5 so periods
   *  don't overlap). fars, climdiv, nbi, lodes: single calendar years. overdose: 12-month periods ending in `endMonth` of each year. Stops: registry/timeline.ts. */
  timeline: z.object({ from: z.number().int(), to: z.number().int(), step: z.number().int().min(1).default(1) })
    .refine((t) => t.to >= t.from, "timeline.to must be ≥ timeline.from").optional(),
  /** Popup links to readable resources about the clicked place or feature (D-35). */
  learnMore: z.array(LearnMore).default([]),
  /** Glossary term ids (data/registry/glossary.yaml) that explain this dataset's jargon. */
  terms: z.array(z.string()).default([]),
  symbology: z.object({
    ramp: Ramp,
    classification: z.enum(["quantile", "equalInterval", "jenks", "manual"]).default("quantile"),
    classes: z.number().int().min(3).max(7).default(5),
    /** Required for `manual`: the classes-1 interior breaks. */
    breaks: z.array(z.number()).optional(),
    /** true = high values are "better"; used only for caption wording. */
    higherIsBetter: z.boolean().optional(),
  }),
});
export const isFeatureLayer = (e: { measure: { kind: string } }) => e.measure.kind === "features";
export type DatasetEntry = z.infer<typeof DatasetEntry>;

export const GlossaryTerm = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  term: z.string(),
  /** One plain sentence: what it means for someone reading the map. */
  short: z.string(),
  /** A short paragraph with more detail. */
  long: z.string(),
  source: z.url().optional(),
});
export type GlossaryTerm = z.infer<typeof GlossaryTerm>;
export type Facet = z.infer<typeof Facet>;
