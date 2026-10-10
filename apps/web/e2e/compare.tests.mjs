// Compare places side by side (roadmap 1.1, issue #117), registered by menus.spec.mjs, which owns
// the browser, server and helpers. Split by feature so the map-menu file stops growing.
export default function compareTests({ test, expect, wait, immerse, tapLonLat, HENNEPIN, dbCalls }) {
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
      await wait(100);
    });
  }

  test("laptop compare places: no Compare with… on a non-default year", async (o) => {
    const { page } = await o("laptop", `/map?d=pct_poverty&lv=county&t=2019&at=${HENNEPIN.join(",")},8`);
    await immerse(page);
    await tapLonLat(page, ...HENNEPIN);
    const det = page.locator('section[aria-label^="Details for Hennepin County"]');
    await det.waitFor();
    await wait(1500);
    expect((await det.getByRole("button", { name: "Compare with…" }).count()) === 0, "Compare with… offered for another year");
  });
}
