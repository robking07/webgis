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
      expect(!(await page.locator("[data-more-topics]").evaluate((d) => d.open)), "More topics open by default");
      expect((await page.locator("[data-compare-row]").count()) > 0, "no topic-group rows");
      expect(!/No data/.test(await page.locator("main").innerText()), "a No data row on the compare page");
      await page.reload({ waitUntil: "load" });
      await verdict.waitFor({ timeout: 20000 });
      expect((await verdict.innerText()).trim() === said, `after reload: "${await verdict.innerText()}" vs "${said}"`);
      expect(!dbCalls(page).length, `database calls: ${dbCalls(page).join(", ")}`);
    });
  }

  test("laptop compare places: no Compare with… on a non-default year", async (o) => {
    // Pick the year in Filters rather than loading with t=2019: a page that opens on an earlier year
    // asks for block-group and block boundary files that don't exist (#159) at any zoom, because
    // every level's source is added on load. The year control only swaps county and tract
    // boundaries, which do exist.
    const { page } = await o("laptop", `/map?d=pct_poverty&lv=county&at=${HENNEPIN.join(",")},8`);
    await live(page).click();
    await page.locator("#filters-panel").waitFor();
    await wait(400);
    await page.locator("#filters-panel [role=radiogroup][aria-label=Years] [role=radio]", { hasText: "2015–2019" }).first().click();
    await page.getByRole("button", { name: "Close filters" }).click();
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
