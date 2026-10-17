// Drill-down (issue #203), registered by menus.spec.mjs: a click focuses a place, fits it, dims the
// rest and draws only its parts inside it; browser Back steps out one level at a time.
export default function drilldownTests({ test, expect, immerse, mapIdle, tapLonLat, HENNEPIN }) {
  const inParam = (page) => new URL(page.url()).searchParams.get("in");
  const waitIn = (page, v) => page.waitForFunction((v) => new URL(location.href).searchParams.get("in") === v, v, { timeout: 15000 });
  /** GEOIDs of `level` drawn on screen (every fill layer of that level, per-state ones too). */
  const drawn = (page, level) => page.evaluate((lv) => {
    const m = window.__wgMap;
    const ids = m.getStyle().layers.filter((l) => l.id.startsWith(`${lv}-fill`)).map((l) => l.id);
    return [...new Set(m.queryRenderedFeatures({ layers: ids }).map((f) => String(f.properties.geoid)))];
  }, level);
  /** The focused place's own shape lies inside the view (it was fitted, not zoomed past). */
  const fits = (page, level, geoid) => page.evaluate(([lv, g]) => {
    const m = window.__wgMap, v = m.getBounds();
    const pts = m.querySourceFeatures(`b-${lv}`, { sourceLayer: lv }).filter((f) => String(f.properties.geoid) === g)
      .flatMap((f) => f.geometry.coordinates.flat(f.geometry.type === "MultiPolygon" ? 2 : 1));
    return pts.length > 0 && pts.every(([x, y]) => x >= v.getWest() - 0.01 && x <= v.getEast() + 0.01 && y >= v.getSouth() - 0.01 && y <= v.getNorth() + 0.01);
  }, [level, geoid]);
  const step = async (page, lonlat, level, want) => {
    const close = page.locator('button[aria-label="Close details"]');
    if (await close.count()) await close.click();
    await tapLonLat(page, ...lonlat);
    await page.waitForFunction((n) => (new URL(location.href).searchParams.get("in") ?? "").length === n, want, { timeout: 15000 });
    await mapIdle(page);
    const g = inParam(page);
    const kids = await drawn(page, level);
    expect(kids.length > 0 && kids.every((k) => k.startsWith(g)), `in=${g}: ${level} drawn outside it: ${kids.filter((k) => !k.startsWith(g)).slice(0, 5).join(", ")} (${kids.length} drawn)`);
    expect(await page.evaluate(() => !!window.__wgMap.getLayer("focus-dim")), `in=${g}: no dim wash`);
    return g;
  };

  for (const vp of ["phone", "laptop"]) {
    test(`${vp} drill-down: Texas → its counties → a county's tracts → a tract's block groups; Back steps out`, async (o) => {
      const { page } = await o(vp, "/map?d=median_household_income");
      await immerse(page);
      const st = await step(page, [-99.3, 31.3], "county", 2);
      expect(st === "48", `focused ${st}, not Texas`);
      expect(await fits(page, "state", "48"), "Texas doesn't fit the screen");
      expect(/Texas/.test(await page.locator("[data-focus-name]").innerText()), "Texas's name isn't shown");
      const co = await step(page, [-97.75, 30.33], "tract", 5);
      expect(await fits(page, "county", co), `county ${co} doesn't fit the screen`);
      const tr = await step(page, [-97.743, 30.268], "block_group", 11);
      expect(await fits(page, "tract", tr), `tract ${tr} doesn't fit the screen (zoomed too deep)`);
      for (const want of [co, st, null]) { await page.goBack(); await waitIn(page, want); }
      await mapIdle(page);
      expect(!(await page.evaluate(() => !!window.__wgMap.getLayer("focus-dim"))), "dim wash left after Back to the whole map");
    });
  }

  test("laptop drill-down: a fixed level still drills; the finest level only selects and says so", async (o) => {
    const { page } = await o("laptop", `/map?d=median_household_income&lv=county&at=${HENNEPIN.join(",")},8`);
    await immerse(page);
    expect(await step(page, HENNEPIN, "tract", 5) === "27053", "a fixed county level didn't drill into Hennepin");
    const { page: p2 } = await o("laptop", `/map?d=asthma&at=${HENNEPIN.join(",")},8`);
    await immerse(p2);
    await tapLonLat(p2, ...HENNEPIN);
    await p2.locator('section[aria-label^="Details for Hennepin County"]').waitFor();
    expect(inParam(p2) === null, `county-only map drilled into ${inParam(p2)}`);
    expect(/finest level/.test(await p2.locator("[data-detail-level]").innerText()), "details don't say it's the finest level");
  });
}
