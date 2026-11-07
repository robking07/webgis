// Backup basemap (issue #552, D-653), registered by menus.spec.mjs: with OpenFreeMap unreachable the map
// switches to the backup style (our own state tiles on a water-coloured background) and keeps its data layers.
export default function basemapTests({ test, expect }) {
  test("laptop basemap down: the map falls back to our state tiles and the credits drop OpenFreeMap", async (o) => {
    const { page } = await o("laptop", "/map?d=median_household_income", { block: /tiles\.openfreemap\.org/, ready: false });
    await page.waitForFunction(() => window.__wgMap?.getSource("omt")?.type === "geojson", null, { timeout: 30000 });
    const drawn = (layer) => page.waitForFunction((l) => window.__wgMap.getLayer(l) && window.__wgMap.queryRenderedFeatures({ layers: [l] }).length > 0, layer, { timeout: 30000 });
    await drawn("us-focus-land"); // U.S. land from our state tiles
    await drawn("state-fill"); // the data layer
    const credits = await page.locator(".wg-credits").innerText();
    expect(/Census/.test(credits) && !/OpenFreeMap|OpenStreetMap/.test(credits), `credits: ${credits}`);
    page.errors.length = 0; // the aborted OpenFreeMap requests log net::ERR_FAILED; that is the point
  });
}
