// Getting around (issue #202), registered by menus.spec.mjs: "Back to the US" when the map is zoomed
// out to two worlds or panned off the U.S.; "Go to" flies to a region or focuses a state like a click.
export default function gettingAroundTests({ test, expect, mapIdle }) {
  const back = (page) => page.getByRole("button", { name: "Back to the US" });
  const center = (page) => page.evaluate(() => { const m = window.__wgMap, c = m.getCenter(); return { lon: c.lng, lat: c.lat, zoom: m.getZoom() }; });

  for (const vp of ["phone", "laptop"]) {
    test(`${vp} getting around: Back to the US after zooming out or panning away, then hides`, async (o) => {
      const { page } = await o(vp, "/map?d=median_household_income");
      expect(!(await back(page).count()), "Back to the US shows on the normal view");
      for (const view of [{ center: [-98, 39], zoom: 0.3 }, { center: [15, 48], zoom: 5 }]) {
        await page.evaluate((v) => window.__wgMap.jumpTo(v), view);
        await back(page).waitFor({ timeout: 5000 });
        await back(page).click();
        await back(page).waitFor({ state: "detached", timeout: 10000 });
        await mapIdle(page);
        const c = await center(page);
        expect(c.lon > -125 && c.lon < -66 && c.lat > 24 && c.lat < 50 && c.zoom > 1.5, `not back on the lower 48: ${JSON.stringify(c)}`);
      }
    });

    test(`${vp} getting around: Go to flies to Alaska, and a state focuses it like a click`, async (o) => {
      const { page } = await o(vp, "/map?d=median_household_income");
      const goTo = page.getByRole("button", { name: "Go to a region or state" });
      const dlg = page.getByRole("dialog", { name: "Go to" });
      await goTo.click();
      await dlg.getByRole("button", { name: "Alaska" }).click();
      await page.waitForFunction(() => { const c = window.__wgMap.getCenter(); return c.lng < -140 && c.lat > 55 && !window.__wgMap.isMoving(); }, null, { timeout: 15000 });
      expect(!(await dlg.count()), "picker stayed open after a pick");
      await goTo.click();
      await dlg.getByRole("button", { name: "Texas" }).waitFor({ timeout: 15000 });
      await dlg.getByRole("button", { name: "Texas" }).click();
      await page.waitForFunction(() => new URL(location.href).searchParams.get("in") === "48", null, { timeout: 15000 });
      await mapIdle(page);
      expect(/Texas/.test(await page.locator("[data-focus-name]").innerText()), "Texas's name isn't shown");
      expect(await page.evaluate(() => !!window.__wgMap.getLayer("focus-dim")), "no dim wash on Texas");
    });
  }
}
