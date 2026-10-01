// Dataset registry schema. One YAML file per dataset in ./datasets. Adding a dataset
// means adding a file here (and, for a new source type, an ingest script) — never UI code.
import { z } from "zod";

const Ramp = z.enum(["blues", "ylgnbu", "oranges", "purples", "viridis", "cividis", "rdbu", "puor", "brbg"]);
const Unit = z.enum(["dollars", "percent", "minutes", "count", "per_sq_mi", "ratio", "years", "deg_f", "inches", "per_100k", "vehicles_per_day", "miles_per_day"]);
export const GeoLevel = z.enum(["state", "county", "tract"]);

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
  /** NOAA nClimDiv county element file: tmpc (mean temp), tmax, tmin, pcpn (precipitation). */
  element: z.enum(["tmpc", "tmax", "tmin", "pcpn"]),
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

/** Daily vehicle miles traveled from HPMS: Σ AADT × section length (milepoints), by county,
 *  divided by residents. Counted roads only; uncounted local roads are missing. */
const HpmsVmtMeasure = z.object({
  kind: z.literal("hpms_vmt"),
  source: z.object({ url: z.url(), file: z.string(), path: z.string(), layerPattern: z.string() }),
  perCapita: z.boolean().default(true),
});

/** A layer drawn from its own geometry (road segments, stops, bridges…) instead of a
 *  choropleth on Census geography. Values live in the tiles; breaks are computed at ingest. */
const FeaturesMeasure = z.object({
  kind: z.literal("features"),
  geometry: z.enum(["line", "point"]),
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
  /** OGR SQL WHERE clause applied while extracting (e.g. "AADT > 0"). */
  where: z.string().optional(),
  /** Numeric field that drives color. */
  valueField: z.string(),
  /** Source field → popup label. Only these fields are kept in the tiles. */
  fields: z.record(z.string(), z.string()),
  /** Ordinal field for importance (lower = more important, e.g. functional class) used for
   *  line width and for thinning at low zoom: at zoom ≥ z, show features with field ≤ max. */
  rank: z.object({ field: z.string(), showUpTo: z.array(z.tuple([z.number(), z.number()])).min(1) }).optional(),
  /** Tile zoom range. */
  zooms: z.tuple([z.number().int(), z.number().int()]).default([3, 12]),
});

export const DatasetEntry = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  title: z.string(),
  /** One sentence shown in the browser and popups. */
  description: z.string(),
  category: z.enum(["Income & poverty", "Commuting", "Vehicles", "Housing", "Population", "Jobs", "Transportation", "Environment", "Health", "Climate"]),
  tags: z.array(z.string()).default([]),
  source: z.object({
    name: z.string(),
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
  measure: z.discriminatedUnion("kind", [AcsMeasure, LodesMeasure, PlacesMeasure, ClimdivMeasure, NbiMeasure, FarsMeasure, FeaturesMeasure, HpmsVmtMeasure]),
  /** Other registry datasets used as inputs to this dataset's model (e.g. PLACES uses county poverty).
   *  Insight pairs with these are flagged: they correlate partly by construction. */
  modelInputs: z.array(z.string()).default([]),
  /** Known coverage gaps, shown in the legend caption and data-sources doc. */
  coverageNote: z.string().optional(),
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
