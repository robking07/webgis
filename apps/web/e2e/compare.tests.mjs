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
      expect(!/No data/.test(await page.locator("main").innerText()), "a No data row on the compare page");
      await page.reload({ waitUntil: "load" });
      await verdict.waitFor({ timeout: 20000 });
      expect((await verdict.innerText()).trim() === said, `after reload: "${await verdict.innerText()}" vs "${said}"`);
      expect(!dbCalls(page).length, `database calls: ${dbCalls(page).join(", ")}`);
    });
  }

  // PR 2a (D-258): laptops and monitors show the map beside the panel, A outlined solid and B dashed, both in view.
  for (const [vp, path, level, a, b, names] of [
    ["laptop", "/compare/27053/27123?d=pct_poverty", "county", "27053", "27123", ["Hennepin County", "Ramsey County"]],
    ["monitor", "/compare/27053100400/27053100200?d=gini_index", "tract", "27053100400", "27053100200", ["Census tract 1004", "Census tract 1002"]],
  ]) {
    test(`${vp} compare places: the map outlines both ${level === "tract" ? "tracts" : "counties"} and frames them`, async (o) => {
      const { page } = await o(vp, path);
      await page.locator("[data-compare-verdict]").waitFor({ timeout: 20000 });
      const got = await page.evaluate(([level, a, b]) => {
        const m = window.__wgMap, st = (id) => m.getFeatureState({ source: `b-${level}`, sourceLayer: level, id });
        const seen = new Set(m.queryRenderedFeatures({ layers: [`${level}-fill`] }).map((f) => String(f.properties.geoid)));
        return { a: st(a), b: st(b), inView: [seen.has(a), seen.has(b)] };
      }, [level, a, b]);
      expect(got.a.selected === true && !got.a.second, `place A outline: ${JSON.stringify(got.a)}`);
      expect(got.b.second === true && !got.b.selected, `place B outline: ${JSON.stringify(got.b)}`);
      expect(got.inView.every(Boolean), `both places in view: ${got.inView}`);
      const key = await page.locator("[data-compare-map]").innerText();
      expect(names.every((n) => key.includes(n)), `map key: ${key}`);
      expect((await page.locator("[data-share]").count()) === 1, "no Share button");
      expect(/\/map\?/.test(await page.getByRole("link", { name: "← Back to the map" }).getAttribute("href")), "Back to the map link");
    });
  }

  // Issue #242: after Compare with…, a tap on another place on the map opens the comparison, even
  // though the first click focused (drilled into) the first place; on phones the drawer shrinks first.
  for (const [vp, level, at, aPt, bPt, url] of [
    ["phone", "tract", "-93.27,44.97,12", [-93.2739, 44.9598], [-93.295, 44.962], /\/compare\/(\d{11})\/(\d{11})\?d=pct_poverty/],
    ["laptop", "tract", "-93.27,44.97,12", [-93.2739, 44.9598], [-93.295, 44.962], /\/compare\/(\d{11})\/(\d{11})\?d=pct_poverty/],
    ["phone", "county", `${HENNEPIN.join(",")},8`, HENNEPIN, [-93.1, 45.02], /\/compare\/(27053)\/(27123)\?d=pct_poverty/],
  ]) {
    test(`${vp} compare places: Compare with… then tap another ${level} on the map`, async (o) => {
      const { page } = await o(vp, `/map?d=pct_poverty&lv=${level}&at=${at}`);
      await immerse(page);
      await tapLonLat(page, ...aPt);
      const det = page.locator('section[aria-label^="Details for"]');
      await det.waitFor();
      await det.getByRole("button", { name: "Compare with…" }).click();
      await page.locator("[data-compare-pick]").waitFor();
      if (vp === "phone") {
        await wait(400);
        const h = (await det.boundingBox()).height;
        expect(h < 230, `drawer still ${h}px tall while picking`);
      }
      await tapLonLat(page, ...bPt);
      await page.waitForURL(url, { timeout: 20000 });
      const [, a, b] = page.url().match(url);
      expect(a !== b, `compared a place with itself: ${page.url()}`);
    });
  }

  test("phone compare places: no map, no map download", async (o) => {
    const { page } = await o("phone", "/compare/27053/27123?d=pct_poverty", { ready: false });
    await page.locator("[data-compare-verdict]").waitFor({ timeout: 20000 });
    await wait(1500);
    expect((await page.locator("[data-compare-map]").count()) === 0, "a map on the phone compare page");
    const tiles = page.requests.filter((u) => /\.pmtiles|maplibre-gl-worker|\/values\/[^/]+\/tract\.json/.test(u));
    expect(!tiles.length && !(await page.evaluate(() => !!window.__wgMap)), `map downloads on the phone: ${tiles.join(", ")}`);
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
