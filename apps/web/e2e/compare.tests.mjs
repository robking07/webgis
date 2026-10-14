// Compare places side by side (roadmap 1.1, issue #117), registered by menus.spec.mjs, which owns
// the browser, server and helpers. Split by feature so the map-menu file stops growing.
export default function compareTests({ test, expect, wait, immerse, tapLonLat, live, HENNEPIN, dbCalls }) {
  for (const vp of ["phone", "laptop"]) {
    test(`${vp} compare places: Hennepin details → Compare with… → Ramsey → headline, survives reload, no database`, async (o) => {
      const { page } = await o(vp, `/map?d=pct_poverty&lv=county&at=${HENNEPIN.join(",")},8`);
      await immerse(page);
      await tapLonLat(page, ...HENNEPIN);
      const det = page.locator('section[aria-label^="Details for Hennepin County"]');
      await det.waitFor();
      await det.getByRole("button", { name: "Compare with…" }).click();
      const input = det.getByLabel(/Compare Hennepin County with another county/);
      await input.fill("Ramsey");
      await det.getByRole("link", { name: "Ramsey County, MN" }).click();
      await page.waitForURL(/\/compare\/27053\/27123\?d=pct_poverty/, { timeout: 20000 });
      const verdict = page.locator("[data-compare-verdict]");
      await verdict.waitFor({ timeout: 20000 });
      const said = (await verdict.innerText()).trim();
      expect(/higher$|^About the same$/.test(said), `headline: "${said}"`);
      const h1 = await page.locator("main h1").innerText();
      expect(h1.includes("Hennepin County, MN") && h1.includes("Ramsey County, MN"), `heading: ${h1}`);
      // Every topic group is listed; only the metric's own (Economy) starts open.
      const groups = await page.locator("details[data-topic]").evaluateAll((ds) => ds.map((d) => [d.dataset.topic, d.open]));
      expect(groups.length > 1 && groups[0][0] === "Economy" && groups[0][1] && groups.slice(1).every(([, o]) => !o), `topic groups: ${JSON.stringify(groups)}`);
      expect((await page.locator("[data-compare-row]").count()) > 0, "no topic-group rows");
      expect(!/No data/.test((await page.locator("[data-compare-headline], details[data-topic]").allInnerTexts()).join(" ")), "a No data row on the compare page"); // the map legend's "No data" swatch is fine
      await page.reload({ waitUntil: "load" });
      await verdict.waitFor({ timeout: 20000 });
      expect((await verdict.innerText()).trim() === said, `after reload: "${await verdict.innerText()}" vs "${said}"`);
      expect(!dbCalls(page).length, `database calls: ${dbCalls(page).join(", ")}`);
    });
  }

  // The compare maps (D-258 PR 2a, 2c): each place's own map, framed on it, A outlined solid and B dashed.
  // Each map's MapLibre instance hangs off its container as __wgMap (debug only).
  const settled = async (page, n) => {
    await page.waitForFunction((n) => {
      const ms = [...document.querySelectorAll("[data-compare-map] .maplibregl-map")].map((el) => el.__wgMap);
      return ms.length === n && ms.every((m) => m && m.isStyleLoaded() && m.areTilesLoaded() && !m.isMoving());
    }, n, { timeout: 30000, polling: 200 });
    await wait(1500); // the fit to the real outline runs on the first idle and animates
    await page.waitForFunction(() => [...document.querySelectorAll("[data-compare-map] .maplibregl-map")].every((el) => !el.__wgMap.isMoving()), null, { timeout: 10000 });
  };
  /** Per map, in page order: the framed place's name, both outlines' state, which places are drawn, center and zoom. */
  const maps = (page, level, a, b) => page.evaluate(([level, a, b]) => [...document.querySelectorAll("[data-compare-map] .maplibregl-map")].map((el) => {
    const m = el.__wgMap, st = (id) => m.getFeatureState({ source: `b-${level}`, sourceLayer: level, id });
    const seen = new Set(m.queryRenderedFeatures({ layers: [`${level}-fill`] }).map((f) => String(f.properties.geoid)));
    return { name: el.closest("[data-compare-map] > *")?.querySelector("[data-compare-map-name]")?.textContent ?? "",
      a: st(a), b: st(b), inView: { a: seen.has(a), b: seen.has(b) }, lng: m.getCenter().lng, zoom: m.getZoom() };
  }), [level, a, b]);

  // Laptops and monitors: two maps side by side, each framed on its own place. Hennepin vs Cherry County, NE
  // (far apart: one shared map made Cherry a speck), two neighboring Minneapolis tracts, Alaska vs Minnesota.
  for (const [vp, path, level, a, b, names, minZoom] of [
    ["laptop", "/compare/27053/31031?d=pct_poverty", "county", "27053", "31031", ["Hennepin County", "Cherry County"], 6.3],
    ["monitor", "/compare/27053100400/27053100200?d=gini_index", "tract", "27053100400", "27053100200", ["Census tract 1004", "Census tract 1002"], 11],
    ["laptop", "/compare/02/27?d=pct_poverty", "state", "02", "27", ["Alaska", "Minnesota"], 1],
  ]) {
    test(`${vp} compare places: two maps side by side, ${names.join(" and ")} each framed and outlined`, async (o) => {
      const { page } = await o(vp, path, { ready: false });
      await page.locator("[data-compare-verdict]").waitFor({ timeout: 20000 });
      await settled(page, 2);
      const got = await maps(page, level, a, b);
      for (const [i, k] of [[0, "a"], [1, "b"]]) {
        const g = got[i];
        expect(g.name.includes(names[i]), `map ${i + 1} label: ${g.name}`);
        expect(g.a.selected === true && !g.a.second && g.b.second === true && !g.b.selected, `map ${i + 1} outlines: ${JSON.stringify([g.a, g.b])}`);
        expect(g.inView[k], `map ${i + 1} shows its place`);
        expect(g.zoom >= minZoom, `map ${i + 1} zoom ${g.zoom} < ${minZoom}`);
      }
      // Alaska: the Aleutians past 180° must not stretch the frame round the world.
      if (a === "02") expect(got[0].lng > -175 && got[0].lng < -140, `Alaska map center ${got[0].lng}`);
      expect((await page.locator("[data-share]").count()) === 1, "no Share button");
      expect(/\/map\?/.test(await page.getByRole("link", { name: "← Back to the map" }).getAttribute("href")), "Back to the map link");
    });
  }

  // Phones and tablets: one map at a time, two tabs named for the places. Anchorage vs Honolulu.
  test("phone compare places: two tabs, each frames its own place", async (o) => {
    const { page } = await o("phone", "/compare/02020/15003?d=pct_poverty", { ready: false });
    await page.locator("[data-compare-verdict]").waitFor({ timeout: 20000 });
    const tabs = page.locator("[data-compare-map] [role=tab]");
    const names = await tabs.allInnerTexts();
    expect(names.length === 2 && /Anchorage/.test(names[0]) && /Honolulu/.test(names[1]), `tabs: ${names}`);
    for (const [i, k] of [[0, "a"], [1, "b"]]) {
      if (i) await tabs.nth(1).click();
      expect((await tabs.nth(i).getAttribute("aria-selected")) === "true", `tab ${i + 1} not selected`);
      await settled(page, 1);
      const [g] = await maps(page, "county", "02020", "15003");
      expect(g.inView[k] && !g.inView[k === "a" ? "b" : "a"], `tab ${i + 1} map shows: ${JSON.stringify(g.inView)}`);
      expect(g.zoom >= 5, `tab ${i + 1} zoom ${g.zoom}`);
    }
  });
  // PR 2b (D-258): counts and shares under the headline everywhere; row counts only on laptops and
  // up; parts-of-a-whole bars in the race and ethnicity group.
  for (const vp of ["phone", "laptop"]) {
    test(`${vp} compare places: counts, share of parent places, parts bars`, async (o) => {
      const { page } = await o(vp, "/compare/27053/27123?d=pct_poverty", { ready: false });
      const counts = page.locator("[data-compare-headline] [data-compare-counts]");
      await counts.first().waitFor({ timeout: 20000 });
      expect((await counts.count()) === 2, "counts under both places");
      await page.locator('[data-compare-headline] [data-compare-share="us"]').nth(1).waitFor({ timeout: 20000 });
      const shares = await page.locator("[data-compare-headline] [data-compare-share]").allInnerTexts();
      expect(shares.length === 4 && shares.some((s) => /of the Minnesota total$/.test(s)) && shares.some((s) => /of the U\.S\. total$/.test(s)), `shares: ${JSON.stringify(shares)}`);
      const race = page.locator('details[data-topic="People"]');
      await race.locator("summary").click();
      const bars = race.locator("[data-compare-parts]");
      await bars.waitFor();
      expect((await bars.locator("tbody tr").count()) === 8, "seven groups plus the remainder");
      await wait(1500);
      const rowCounts = await page.locator("[data-compare-row-counts]").count();
      const countFiles = page.requests.filter((u) => /\.counts\.json|\/values\/counts\//.test(u));
      if (vp === "phone") {
        expect(rowCounts === 0, "row counts on the phone");
        expect(countFiles.every((u) => /\/values\/pct_poverty\//.test(u)), `phone fetched other counts files: ${countFiles.join(", ")}`);
      } else {
        expect(rowCounts > 0, "no row counts on a laptop");
      }
    });
  }

  test("laptop compare places: no Compare with… on a non-default year", async (o) => {
    // Pick the year in Map options rather than loading with t=2019: a page that opens on an earlier year
    // asks for block-group and block boundary files that don't exist (#159) at any zoom, because
    // every level's source is added on load. The year control only swaps county and tract
    // boundaries, which do exist.
    const { page } = await o("laptop", `/map?d=pct_poverty&lv=county&at=${HENNEPIN.join(",")},8`);
    await live(page).click();
    await page.locator("#filters-panel").waitFor();
    await wait(400);
    await page.locator("#filters-panel [role=radiogroup][aria-label=Years] [role=radio]", { hasText: "2015–2019" }).first().click();
    await page.getByRole("button", { name: "Close map options" }).click();
    await page.waitForSelector("#filters-panel", { state: "detached" });
    await page.waitForFunction(() => new URLSearchParams(location.search).get("t") === "2019", null, { timeout: 10000 });
    await immerse(page);
    await tapLonLat(page, ...HENNEPIN);
    const det = page.locator('section[aria-label^="Details for Hennepin County"]');
    await det.waitFor();
    // The period's value is in; the panel has decided whether to offer compare.
    await page.waitForFunction(() => /\d%/.test(document.querySelector('section[aria-label^="Details for"]')?.innerText ?? ""), null, { timeout: 15000 });
    await wait(500);
    expect((await det.getByRole("button", { name: "Compare with…" }).count()) === 0, "Compare with… offered for another year");
  });
}
