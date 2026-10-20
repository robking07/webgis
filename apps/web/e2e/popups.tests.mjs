// Hover popups (issue #236, D-359), registered by menus.spec.mjs, which owns the browser, server and
// helpers: the card stays inside a narrow window, the change hover's values add up to the change,
// and the environmental justice period reads as a date.
export default function popupTests({ test, expect, wait, mapIdle, pointerAt, hoverCard, HENNEPIN, NEBRASKA }) {
  const hoverAt = async (page, x, y) => { await page.mouse.move(x - 5, y - 5); await page.mouse.move(x, y, { steps: 4 }); };

  test("narrow window: the hover card flips to stay inside the map", async (o) => {
    const { page } = await o({ viewport: { width: 420, height: 800 } }, "/map?d=pct_carpool");
    const { width } = page.viewportSize();
    // Put Nebraska 40 px from the right edge, where a card to the pointer's right would run off.
    await page.evaluate(([c, dx]) => window.__wgMap.easeTo({ center: c, offset: [dx, 0], duration: 0 }), [NEBRASKA, width / 2 - 40]);
    await mapIdle(page);
    const [x, y] = await page.evaluate((c) => { const p = window.__wgMap.project(c); return [p.x, p.y]; }, NEBRASKA);
    await hoverAt(page, x, y);
    const card = hoverCard(page).first();
    await card.waitFor({ timeout: 8000 });
    await wait(200);
    const box = await card.boundingBox();
    expect(box.x >= 0 && box.x + box.width <= width + 1, `card ran off the window: x ${Math.round(box.x)}, width ${Math.round(box.width)} in ${width}`);
  });

  test("laptop change hover: From and To show one decimal and add up to the change (#200)", async (o) => {
    const { page } = await o("laptop", `/map?d=pct_poverty&lv=county&at=${HENNEPIN.join(",")},7.2&since=2019`);
    const [x, y] = await pointerAt(page, ...HENNEPIN);
    await hoverAt(page, x, y);
    const hover = page.locator("[data-change-hover]");
    await hover.waitFor({ timeout: 8000 });
    const values = await hover.locator(".wg-popup-lead-cell-value").allInnerTexts();
    expect(values.length === 2 && values.every((v) => /^\d+(\.\d)?%$/.test(v.trim())), `values: ${values}`);
    const lead = (await hover.locator(".wg-popup-lead-value").innerText()).trim();
    const m = lead.match(/^([+−])([\d.]+) pts$/);
    if (m) {
      const [from, to] = values.map(parseFloat);
      const change = (m[1] === "−" ? -1 : 1) * parseFloat(m[2]);
      expect(Math.abs(from + change - to) < 0.051, `${values.join(" → ")} doesn't add up to ${lead}`);
    }
  });

  test("laptop environmental justice hover: the period reads Dec. 2024", async (o) => {
    const { page } = await o("laptop", "/map?d=cejst_pct_pop_disadvantaged");
    const [x, y] = await pointerAt(page, ...NEBRASKA);
    await hoverAt(page, x, y);
    const card = hoverCard(page).first();
    await card.waitFor({ timeout: 8000 });
    const period = (await card.locator(".wg-popup-lead-period").innerText()).trim();
    expect(period === "Dec. 2024", `period: ${period}`);
  });
}
