// The walkability roll-up lives in the registry's `select` SQL (features.ts runs it in GDAL's SQLite);
// this runs that same SQL on a tiny table in Node's SQLite.
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { loadRegistry } from "@webgis/registry/load";

const entry = loadRegistry().find((e) => e.id === "walkability_index")!;
const sql = entry.measure.kind === "features" ? entry.measure.select!.replaceAll("{layer}", "tracts") : "";

describe("walkability_index tract roll-up", () => {
  it("averages block groups by population, skips empty ones, and blanks tracts with no residents", () => {
    const d = new DatabaseSync(":memory:");
    d.exec(`CREATE TABLE tracts (GEOID TEXT, geom BLOB); CREATE TABLE "join" (STATEFP TEXT, COUNTYFP TEXT, TRACTCE TEXT, TotPop INTEGER, NatWalkInd REAL);
      INSERT INTO tracts VALUES ('51019050100', NULL), ('36061000100', NULL), ('01001020100', NULL);
      INSERT INTO "join" VALUES ('51','019','050100',100,4), ('51','019','050100',300,16), ('51','019','050100',0,20),
        ('36','061','000100',0,12);`);
    const rows = Object.fromEntries(d.prepare(sql).all().map((r) => [r.tract, r]));
    expect(rows["51019050100"]).toMatchObject({ walk_index: 13, band: "Above average", population: 400 }); // (4·100 + 16·300) / 400
    expect(rows["36061000100"]).toMatchObject({ walk_index: null, band: null, population: 0 });
    expect(rows["01001020100"]).toBeUndefined(); // no block groups at all (none in the real data)
  });
});
