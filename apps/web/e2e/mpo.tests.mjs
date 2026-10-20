// MPOs in search (issue #276), registered by menus.spec.mjs: picking one outlines the whole area
// and names it; the share URL reopens it; a click on the map never selects it.
export default function mpoTests({ test, expect, immerse, mapIdle, tapLonLat, HENNEPIN }) {
  const MET_COUNCIL = "27197300";
  const mpoParam = (page) => new URL(page.url()).searchParams.get("mpo");
  /** The outline's GeoJSON source is on the map and has its shape. */
  const outlined = (page) => page.waitForFunction(() => {
    const m = window.__wgMap;
    return !!m.getLayer("area-highlight") && m.querySourceFeatures("area").length > 0;
  }, null, { timeout: 15000 });

  for (const vp of ["laptop", "phone"]) {
    test(`${vp} MPO search: "Metropolitan Council" → pick outlines it, names it, and the link reopens it; a map click doesn't select it`, async (o) => {
      const { page } = await o(vp, "/map?d=pct_poverty");
      await page.keyboard.press("/");
      const dlg = page.getByRole("dialog", { name: "Search places and datasets" });
      const places = dlg.getByRole("region", { name: "Places" });
      await dlg.getByRole("combobox").fill("MPO");
      await places.getByRole("option", { name: /MPO$/ }).first().waitFor({ timeout: 15000 });
      await dlg.getByRole("combobox").fill("Metropolitan Council");
      await places.getByRole("option", { name: /^Metropolitan Council\s*MPO$/ }).click();
      await page.waitForFunction((id) => new URL(location.href).searchParams.get("mpo") === id, MET_COUNCIL, { timeout: 15000 });
      await outlined(page);
      const name = () => page.locator("[data-focus-name]").innerText();
      expect(/Metropolitan Council · MN/.test(await name()), `heading: ${await name()}`);

      await mapIdle(page);
      await tapLonLat(page, ...HENNEPIN);
      await mapIdle(page);
      expect(mpoParam(page) === MET_COUNCIL, `a click changed mpo to ${mpoParam(page)}`);
      const sel = new URL(page.url()).searchParams.get("in");
      expect(sel !== MET_COUNCIL, "a click selected the MPO");

      const { page: shared } = await o(vp, `/map?d=pct_poverty&mpo=${MET_COUNCIL}`);
      await outlined(shared);
      expect(/Metropolitan Council/.test(await shared.locator("[data-focus-name]").innerText()), "shared link doesn't name the MPO");
      await shared.locator("[data-focus-name] button").click();
      await shared.waitForFunction(() => !new URL(location.href).searchParams.get("mpo"), null, { timeout: 5000 });
      await shared.waitForFunction(() => !window.__wgMap.getLayer("area-highlight"), null, { timeout: 5000 });
    });
  }
}
