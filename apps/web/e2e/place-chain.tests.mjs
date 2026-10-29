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
      await page.waitForFunction(() => document.querySelectorAll("[data-key-numbers] dt").length === 6, null, { timeout: 15000 });
      const text = await keys.innerText();
      for (const label of ["Residents", "Median household income", "Median age", "Median home value", "Average commute time", "Bachelor's degree or higher"]) {
        expect(text.includes(label), `key numbers lack "${label}": ${text}`);
      }
      expect(/±/.test(text), `no margins in the key numbers: ${text}`);
      // The header comes before the full list, and fits the phone's width.
      const box = await keys.boundingBox();
      expect(box.x >= 0 && box.x + box.width <= page.viewportSize().width, `key numbers overflow: ${JSON.stringify(box)}`);
    });
  }
}
