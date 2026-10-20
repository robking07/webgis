// The map's data table on phones (issue #239), registered by menus.spec.mjs.
export default function tableTests({ test, expect, wait }) {
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  /** A one-finger vertical swipe with real touch events. */
  async function swipe(page, x, y0, y1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0, id: 1 }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 10, id: 1 }] });
      await wait(20);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
    await wait(500);
  }

  for (const reducedMotion of ["no-preference", "reduce"]) {
    test(`phone table: swipe up for full screen, down back to the map, down again closes (motion: ${reducedMotion})`, async (o) => {
      const { page } = await o({ ...phone, reducedMotion }, "/map?d=pct_poverty&lv=state");
      await page.getByRole("button", { name: "Table", exact: true }).first().click();
      const table = page.locator('section[aria-label^="Table of"]');
      await table.locator("tbody tr").first().waitFor({ timeout: 15000 });
      const docked = (await table.boundingBox()).height;
      expect(docked < 844 * 0.5, `table opens ${docked}px tall`);
      const top = async () => (await table.boundingBox()).y;
      await swipe(page, 120, (await top()) + 40, (await top()) - 300);
      const full = await table.boundingBox();
      expect(full.height > 844 * 0.85 && (await table.getAttribute("data-full")) === "true", `swipe up left the table ${full.height}px tall`);
      expect(await table.locator("tbody tr").count() > 10, "full screen shows only a few rows");
      await swipe(page, 120, (await top()) + 40, (await top()) + 340);
      const back = (await table.boundingBox()).height;
      expect(Math.abs(back - docked) < 4, `swipe down left the table ${back}px tall (docked ${docked}px)`);
      // The handle is a button too: tap to expand, tap to collapse.
      const handle = table.getByRole("button", { name: "Expand the table to full screen" });
      await handle.click();
      await table.getByRole("button", { name: "Show the map above the table" }).click();
      await wait(400);
      expect(Math.abs((await table.boundingBox()).height - docked) < 4, "handle taps don't return to the docked height");
      await swipe(page, 120, (await top()) + 40, (await top()) + 300);
      expect(await table.count() === 0, "swipe down from the docked height didn't close the table");
    });
  }
}
