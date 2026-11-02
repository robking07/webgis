// Pick an area (#455, #391), registered by menus.spec.mjs: "Pick an area", two taps in Hennepin County, and
// the picked area's total with its margin; Done leaves picking, and a tap opens details again.
export default function pickAreaTests({ test, expect, immerse, mapIdle, tapLonLat }) {
  const A = [-93.34, 44.9], B = [-93.3, 44.9];
  for (const vp of ["laptop", "phone"]) {
    test(`${vp} pick an area: two Hennepin tracts → "2 tracts picked" and their total ±; Done leaves picking`, async (o) => {
      const { page } = await o(vp, `/map?d=pct_poverty&lv=tract&at=${A[0]},${A[1]},11`);
      await immerse(page);
      const pick = page.getByRole("button", { name: "Pick an area" });
      await pick.click();
      await tapLonLat(page, ...A);
      await tapLonLat(page, ...B);
      const area = page.locator("[data-pick-area]");
      await area.getByText("2 tracts picked").waitFor({ timeout: 10000 });
      const row = area.locator('[data-region-dataset="pct_poverty"]');
      await row.waitFor({ timeout: 15000 });
      const text = await row.innerText();
      expect(/%/.test(text) && /±/.test(text), `no total with a margin: ${text}`);
      const flagged = await page.evaluate(() => window.__wgMap.querySourceFeatures("b-tract", { sourceLayer: "tract" })
        .filter((f) => window.__wgMap.getFeatureState({ source: "b-tract", sourceLayer: "tract", id: f.id }).picked).map((f) => f.id));
      expect(new Set(flagged).size === 2, `picked outlines: ${[...new Set(flagged)]}`);
      expect((await page.locator('section[aria-label^="Details for"]').count()) === 0, "a pick opened details");

      const done = area.getByRole("button", { name: "Done" });
      if (vp === "phone") {
        // A large target, and the bar keeps clear of the map's buttons on the right.
        const d = await done.boundingBox(), p = await pick.boundingBox(), a = await area.boundingBox();
        expect(d.height >= 44, `Done is ${d.height}px tall`);
        expect(a.y >= p.y + p.height, `the bar ${JSON.stringify(a)} covers Pick an area ${JSON.stringify(p)}`);
      }
      await done.click();
      expect((await pick.getAttribute("aria-pressed")) === "false", "Done didn't leave picking");
      expect(/2 tracts picked/.test(await area.innerText()), "the total went away after Done");
      await mapIdle(page);
      await tapLonLat(page, ...A);
      await page.locator('section[aria-label^="Details for"]').waitFor({ timeout: 10000 });
    });
  }

  test(`laptop pick an area: Hennepin, Ramsey, Dakota → "3 counties picked" and their total; tracts wait for Clear`, async (o) => {
    const { page } = await o("laptop", "/map?d=pct_poverty&at=-93.2,44.9,8");
    await immerse(page);
    const pick = page.getByRole("button", { name: "Pick an area" });
    await pick.click();
    for (const at of [[-93.45, 45.0], [-93.1, 45.02], [-93.1, 44.7]]) await tapLonLat(page, ...at);
    const area = page.locator("[data-pick-area]");
    await area.getByText("3 counties picked").waitFor({ timeout: 10000 });
    const row = area.locator('[data-region-dataset="pct_poverty"]');
    await row.waitFor({ timeout: 15000 });
    expect(/±/.test(await row.innerText()), "no county total with a margin");
    const flagged = await page.evaluate(() => [...new Set(window.__wgMap.querySourceFeatures("b-county", { sourceLayer: "county" })
      .filter((f) => window.__wgMap.getFeatureState({ source: "b-county", sourceLayer: "county", id: f.id }).picked).map((f) => f.id))].sort().join());
    expect(flagged === "27037,27053,27123", `picked counties: ${flagged}`);

    // Tracts drawn: a tap doesn't mix a tract into the counties.
    await page.evaluate(() => window.__wgMap.jumpTo({ zoom: 10 }));
    await tapLonLat(page, ...A);
    await area.getByText("Picking counties · Clear to pick tracts").waitFor({ timeout: 10000 });
    expect(/The sum of 3 counties/.test(await area.innerText()), "a tract was added to the counties");
    await area.getByRole("button", { name: "Clear" }).click();
    await pick.click();
    await tapLonLat(page, ...A);
    await area.getByText("1 tract picked").waitFor({ timeout: 10000 });
  });
}
