// npm run ingest -- <step> [dataset or level ids…]
// Steps: geographies | label-mask | mpo | timeline | acs | acs-bg | census2020 | lodes | places | climdiv | nbi | fars | overdose | airquality | features | vmt | cejst | ddp287g | tri | nri | svi | lead | food-access | tiles | publish-tiles | publish-values | publish-geo | publish-data | counts | publish-counts | details | publish-details | tract-geo | export | insights [--reflag] | combinations [--dry-run] | tracts-out | docs | mn-catalog | mpo-plans | publish-mpo-plans [--dry-run] | all
import { ingestGeographies, tractGeography } from "./geographies.ts";
import { ingestAcs, ingestAcsTimeline } from "./acs.ts";
import { ingestCensus2020 } from "./census2020.ts";
import { ingestLodes, ingestLodesTimeline } from "./lodes.ts";
import { buildTiles } from "./tiles.ts";
import { exportNames, exportRegistry, exportSearch, exportValues } from "./exportweb.ts";
import { computeInsights, reflagInsights } from "./insights.ts";
import { computeCombinations } from "./combinations.ts";
import { ingestPlaces } from "./places.ts";
import { ingestClimdiv, ingestClimdivTimeline } from "./climdiv.ts";
import { publishCounts, publishData, publishDetails, publishGeo, publishTiles, publishValues } from "./publish-tiles.ts";
import { setCountsOnly } from "./values.ts";
import { detailsOut } from "./details.ts";
import { writeDataSourcesDoc } from "./docs.ts";
import { mnCatalog } from "./mn-catalog.ts";
import { ingestNbi, ingestNbiTimeline } from "./nbi.ts";
import { ingestFars, ingestFarsTimeline } from "./fars.ts";
import { ingestAirQuality } from "./airquality.ts";
import { ingestOverdose, ingestOverdoseTimeline } from "./overdose.ts";
import { ingestFeatures } from "./features.ts";
import { ingestVmt } from "./vmt.ts";
import { ingestCejst } from "./cejst.ts";
import { ingestDdp287g } from "./ddp287g.ts";
import { ingestTri } from "./tri.ts";
import { ingestLead } from "./lead.ts";
import { ingestFoodAccess } from "./foodaccess.ts";
import { ingestNri } from "./nri.ts";
import { ingestSvi } from "./svi.ts";
import { buildLabelMask } from "./label-mask.ts";
import { buildMpo } from "./mpo.ts";
import { checkMpoPlans, publishMpoPlans } from "./mpo-plans.ts";
import { tractsOut } from "./tracts.ts";
const [step, ...rest] = process.argv.slice(2);
const only = rest.length ? rest : undefined;
const steps: Record<string, () => Promise<void> | void> = {
  geographies: ingestGeographies,
  acs: () => ingestAcs(only),
  "acs-bg": () => ingestAcs(only, ["block_group"]),
  census2020: () => ingestCensus2020(only),
  lodes: () => ingestLodes(only),
  places: () => ingestPlaces(only),
  climdiv: () => ingestClimdiv(only),
  nbi: () => ingestNbi(only),
  fars: () => ingestFars(only),
  airquality: () => ingestAirQuality(only),
  overdose: () => ingestOverdose(only),
  features: () => ingestFeatures(only),
  vmt: () => ingestVmt(only),
  cejst: () => ingestCejst(only),
  ddp287g: () => ingestDdp287g(only),
  tri: () => ingestTri(only),
  lead: () => ingestLead(only),
  "food-access": () => ingestFoodAccess(only),
  nri: () => ingestNri(only),
  svi: () => ingestSvi(only),
  tiles: () => buildTiles(only),
  "label-mask": buildLabelMask,
  mpo: buildMpo,
  // #365: re-check, keep and Wayback-snapshot every MPO plan in data/registry/mpo-plans.json; then upload the copies.
  "mpo-plans": checkMpoPlans,
  "publish-mpo-plans": () => publishMpoPlans(rest.includes("--dry-run")),
  // Year control (D-36): earlier periods, written to the web export only. ACS first (FARS
  // uses its 2015–2019 population).
  timeline: async () => { await ingestAcsTimeline(only); await ingestFarsTimeline(only); await ingestClimdivTimeline(only);
    await ingestNbiTimeline(only); await ingestLodesTimeline(only); await ingestOverdoseTimeline(only); exportRegistry(); },
  "publish-tiles": () => publishTiles(only),
  // S2: every value file, names, search and tract geography live on R2 beside the tiles, not in
  // the site's folder. `publish-data` uploads all of it (values/, geo/, details/); only changed files go up.
  "publish-values": () => publishValues(only),
  "publish-geo": publishGeo,
  "publish-data": () => publishData(only),
  // #156, #154: margins of error, the counts behind each map and U.S. rows, as new files only. Re-runs
  // the source downloads but writes nothing else (no database writes, no existing value files or
  // tiles); `publish-counts` then uploads just those files.
  counts: async () => {
    setCountsOnly();
    await ingestAcs(only); await ingestAcsTimeline(only); await ingestCensus2020(only);
    await ingestLodes(only); await ingestFars(only); await ingestDdp287g(only); await ingestTri(only);
  },
  "publish-counts": () => publishCounts(only),
  "tract-geo": tractGeography,
  // State and county click details as static files on R2 (S1): the browser no longer queries the database.
  details: detailsOut,
  "publish-details": publishDetails,
  docs: writeDataSourcesDoc,
  "mn-catalog": mnCatalog,
  export: async () => { exportRegistry(); await exportNames(); await exportSearch(); await exportValues(only); },
  search: exportSearch,
  // --reflag: re-apply the by-construction rules to the committed insights.json (no database; captions and fingerprints kept).
  insights: () => (rest.includes("--reflag") ? reflagInsights() : computeInsights()),
  // #280: sets of 3–5 datasets from the pair screen in insights.json; --dry-run prints yields at 3 thresholds, writes nothing.
  combinations: () => computeCombinations(rest.includes("--dry-run")),
  // D-113: tract values live in static files; moves the database's tract rows out (--drop deletes them).
  "tracts-out": () => tractsOut(rest),
  // Every ingest step above also goes in `all`.
  all: async () => {
    await ingestGeographies(); await ingestAcs(); await ingestCensus2020(); await ingestLodes(); await ingestPlaces(); await ingestClimdiv(); await ingestNbi(); await ingestFars(); await ingestOverdose(); await ingestAirQuality();
    await ingestFeatures(); await ingestVmt(); await ingestCejst(); await ingestDdp287g(); await ingestTri(); await ingestNri(); await ingestLead(); await ingestSvi(); await ingestFoodAccess();
    await ingestAcsTimeline(); await ingestFarsTimeline(); await ingestClimdivTimeline(); await ingestNbiTimeline(); await ingestLodesTimeline(); await ingestOverdoseTimeline(); await buildLabelMask(); await buildTiles();
    await tractGeography();
    exportRegistry(); await exportNames(); await exportSearch(); await exportValues(); await detailsOut(); await computeInsights(); await computeCombinations(); await writeDataSourcesDoc();
  },
};
if (!step || !steps[step]) {
  console.error(`usage: npm run ingest -- <${Object.keys(steps).join("|")}> [ids…]`);
  process.exit(1);
}
await steps[step]();
