// The place chain and key numbers (issue #364), registered by menus.spec.mjs: a tract click lists the
// places it sits inside (state › MPO › metro › county › city), each one opens; a place profile opens
// with its key numbers.
export default function placeChainTests({ test, expect, immerse, mapIdle, tapLonLat }) {
  const EDINA = [-93.34, 44.90];
  for (const vp of ["phone", "laptop"]) {
    test(`${vp} place chain: an Edina tract lists Minnesota › Met Council › metro › Hennepin › Edina; Edina opens as a city`, async (o) => {
      const { page } = await o(vp, `/map?d=median_household_income&lv=tract&at=${EDINA[0]},${EDINA[1]},11`);
      await immerse(page);
      await tapLonLat(page, ...EDINA);
      const det = page.locator('section[aria-label^="Details for"]');
      await det.waitFor();
      const nav = det.locator("[data-place-chain]");
      // The city is the last lookup to land (its outline is tested at the spot).
      await nav.getByRole("button", { name: "Edina" }).waitFor({ timeout: 15000 });
      const text = (await nav.innerText()).replace(/\s+/g, " ");
      expect(/^Minnesota › Metropolitan Council \(MPO\) › Minneapolis-St\. Paul-Bloomington metro › Hennepin County › Edina › /.test(text), `chain: ${text}`);
      await nav.getByRole("button", { name: "Edina" }).click();
      await page.waitForFunction(() => new URL(location.href).searchParams.get("area") === "place2718188", null, { timeout: 10000 });
      await page.locator("[data-area-value]").waitFor({ timeout: 15000 });
      expect((await det.count()) === 0, "the tract's details stayed open after opening Edina");
      await mapIdle(page);
    });

    test(`${vp} place profile: Hennepin County opens with six key numbers and their margins`, async (o) => {
      const { page } = await o(vp, "/place/27053", { ready: false });
      const keys = page.locator("[data-key-numbers]");
      await keys.waitFor({ timeout: 20000 });
      await page.waitForFunction(() => document.querySelectorAll("[data-key-numbers] > dl dt").length === 6, null, { timeout: 15000 });
      const text = await keys.innerText();
      for (const label of ["Residents", "Median household income", "Median age", "Median home value", "Average commute time", "Bachelor's degree or higher"]) {
        expect(text.includes(label), `key numbers lack "${label}": ${text}`);
      }
      expect(/±/.test(text), `no margins in the key numbers: ${text}`);
      // #443: the grant rows sit in their own block under the key numbers.
      const grant = await page.locator("[data-grant-numbers]").innerText();
      for (const label of ["Households with no vehicle", "Traffic deaths"]) expect(grant.includes(label), `grant numbers lack "${label}": ${grant}`);
      // The header comes before the full list, and fits the phone's width.
      const box = await keys.boundingBox();
      expect(box.x >= 0 && box.x + box.width <= page.viewportSize().width, `key numbers overflow: ${JSON.stringify(box)}`);
    });

    test(`${vp} context notes (#411): Hennepin's list shows the race and the income note once each`, async (o) => {
      const { page } = await o(vp, "/place/27053", { ready: false });
      await page.locator("[data-key-numbers]").waitFor({ timeout: 20000 });
      for (const [k, start] of [["Race and ethnicity", "These numbers count how people describe themselves"], ["Income and poverty", "Income and poverty here come from what households report"]]) {
        const n = page.locator(`[data-context-note="${k}"]`);
        await n.first().waitFor({ state: "attached", timeout: 15000 });
        expect((await n.count()) === 1, `${k} notes: ${await n.count()}`);
        expect((await n.innerText()).startsWith(start), `${k} note text`);
      }
    });

    test(`${vp} similar counties (#291): Hennepin's profile lists five, each linking to Compare`, async (o) => {
      const { page } = await o(vp, "/place/27053", { ready: false });
      const list = page.locator("[data-similar-places]");
      await list.waitFor({ timeout: 20000 });
      const links = list.locator("li a");
      expect((await links.count()) === 5, `similar counties: ${await links.count()}`);
      const href = await links.first().getAttribute("href");
      expect(/^\/compare\/27053\/\d{5}(\?d=\w+)?$/.test(href), `similar link: ${href}`);
      expect(/Both (high|low):/.test(await list.innerText()), "no 'Both high/low' line");
    });
  }

  // The region data pack (issue #370): a county page downloads every map for its tracts as one .xlsx.
  test("laptop tract data pack: Hennepin's page downloads mapwich-tracts-27053.xlsx", async (o) => {
    const { page } = await o("laptop", "/place/27053", { ready: false });
    const btn = page.getByRole("button", { name: "Download tract data (Excel)" });
    await btn.waitFor({ timeout: 20000 });
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 20000 }), btn.click()]);
    expect(download.suggestedFilename() === "mapwich-tracts-27053.xlsx", `file name: ${download.suggestedFilename()}`);
    await page.getByText("Join it to tract boundaries in QGIS or ArcGIS").click();
    await page.getByText(/join GEOID to GEOID/).waitFor();
  });
}
