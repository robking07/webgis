// npm run ingest -- <step> [dataset or level ids…]
// Steps: geographies | label-mask | timeline | acs | acs-bg | census2020 | lodes | places | climdiv | nbi | fars | features | vmt | cejst | ddp287g | tiles | publish-tiles | publish-values | export | insights | tracts-out | docs | mn-catalog | all
import { ingestGeographies } from "./geographies.ts";
import { ingestAcs, ingestAcsTimeline } from "./acs.ts";
import { ingestCensus2020 } from "./census2020.ts";
import { ingestLodes, ingestLodesTimeline } from "./lodes.ts";
import { buildTiles } from "./tiles.ts";
import { exportNames, exportRegistry, exportSearch, exportValues } from "./exportweb.ts";
import { computeInsights } from "./insights.ts";
import { ingestPlaces } from "./places.ts";
import { ingestClimdiv, ingestClimdivTimeline } from "./climdiv.ts";
import { publishTiles, publishValues } from "./publish-tiles.ts";
import { writeDataSourcesDoc } from "./docs.ts";
import { mnCatalog } from "./mn-catalog.ts";
import { ingestNbi, ingestNbiTimeline } from "./nbi.ts";
import { ingestFars, ingestFarsTimeline } from "./fars.ts";
import { ingestFeatures } from "./features.ts";
import { ingestVmt } from "./vmt.ts";
import { ingestCejst } from "./cejst.ts";
import { ingestDdp287g } from "./ddp287g.ts";
import { buildLabelMask } from "./label-mask.ts";
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
  features: () => ingestFeatures(only),
  vmt: () => ingestVmt(only),
  cejst: () => ingestCejst(only),
  ddp287g: () => ingestDdp287g(only),
  tiles: () => buildTiles(only),
  "label-mask": buildLabelMask,
  // Year control (D-36): earlier periods, written to the web export only. ACS first (FARS
  // uses its 2015–2019 population).
  timeline: async () => { await ingestAcsTimeline(only); await ingestFarsTimeline(only); await ingestClimdivTimeline(only);
    await ingestNbiTimeline(only); await ingestLodesTimeline(only); exportRegistry(); },
  "publish-tiles": () => publishTiles(only),
  "publish-values": () => publishValues(only),
  docs: writeDataSourcesDoc,
  "mn-catalog": mnCatalog,
  export: async () => { exportRegistry(); await exportNames(); await exportSearch(); await exportValues(only); },
  search: exportSearch,
  insights: computeInsights,
  // D-113: tract values live in static files; moves the database's tract rows out (--drop deletes them).
  "tracts-out": () => tractsOut(rest),
  all: async () => {
    await ingestGeographies(); await ingestAcs(); await ingestLodes(); await ingestPlaces(); await ingestClimdiv(); await ingestNbi(); await ingestFars();
    await ingestAcsTimeline(); await ingestFarsTimeline(); await ingestClimdivTimeline(); await ingestNbiTimeline(); await ingestLodesTimeline(); await buildTiles();
    exportRegistry(); await exportNames(); await exportValues(); await computeInsights(); await writeDataSourcesDoc();
  },
};
if (!step || !steps[step]) {
  console.error(`usage: npm run ingest -- <${Object.keys(steps).join("|")}> [ids…]`);
  process.exit(1);
}
await steps[step]();
