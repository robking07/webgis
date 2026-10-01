// npm run ingest -- <step> [dataset or level ids…]
// Steps: geographies | acs | lodes | places | climdiv | nbi | fars | features | vmt | cejst | ddp287g | tiles | publish-tiles | export | insights | docs | mn-catalog | all
import { ingestGeographies } from "./geographies.ts";
import { ingestAcs } from "./acs.ts";
import { ingestLodes } from "./lodes.ts";
import { buildTiles } from "./tiles.ts";
import { exportNames, exportRegistry, exportSearch, exportValues } from "./exportweb.ts";
import { computeInsights } from "./insights.ts";
import { ingestPlaces } from "./places.ts";
import { ingestClimdiv } from "./climdiv.ts";
import { publishTiles } from "./publish-tiles.ts";
import { writeDataSourcesDoc } from "./docs.ts";
import { mnCatalog } from "./mn-catalog.ts";
import { ingestNbi } from "./nbi.ts";
import { ingestFars } from "./fars.ts";
import { ingestFeatures } from "./features.ts";
import { ingestVmt } from "./vmt.ts";
import { ingestCejst } from "./cejst.ts";
import { ingestDdp287g } from "./ddp287g.ts";

const [step, ...rest] = process.argv.slice(2);
const only = rest.length ? rest : undefined;
const steps: Record<string, () => Promise<void> | void> = {
  geographies: ingestGeographies,
  acs: () => ingestAcs(only),
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
  "publish-tiles": () => publishTiles(only),
  docs: writeDataSourcesDoc,
  "mn-catalog": mnCatalog,
  export: async () => { exportRegistry(); await exportNames(); await exportSearch(); await exportValues(only); },
  search: exportSearch,
  insights: computeInsights,
  all: async () => {
    await ingestGeographies(); await ingestAcs(); await ingestLodes(); await ingestPlaces(); await ingestClimdiv(); await ingestNbi(); await ingestFars(); await buildTiles();
    exportRegistry(); await exportNames(); await exportValues(); await computeInsights(); await writeDataSourcesDoc();
  },
};
if (!step || !steps[step]) {
  console.error(`usage: npm run ingest -- <${Object.keys(steps).join("|")}> [ids…]`);
  process.exit(1);
}
await steps[step]();
