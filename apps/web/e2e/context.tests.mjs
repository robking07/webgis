// "Why this matters" (issue #115, D-279), registered by menus.spec.mjs, which owns the browser, server
// and helpers. Drafts show only with ?context=preview; production builds carry none.
const { default: contexts } = await import(new URL("../src/generated/context.json", import.meta.url), { with: { type: "json" } });
const traffic = contexts.find((c) => c.id === "traffic_fatalities");
const CARD = 'section[aria-label="Mapped dataset"]';
const PANEL = 'section[aria-label="Traffic deaths: why this matters"]';

export default function contextTests({ test, expect, wait }) {
  test("laptop why this matters: opens a cited panel, shifts the map clear of it, Esc closes and shifts back", async (o) => {
    const { page } = await o("laptop", "/map?d=traffic_fatalities&context=preview");
    expect(!!traffic, "traffic_fatalities has no context in src/generated/context.json");
    const link = page.locator(`${CARD} [data-context-link]`);
    expect(await link.isVisible(), "no Why this matters link on the card");
    expect((await page.locator(PANEL).count()) === 0, "panel open before the link was clicked");
    await link.click();
    const panel = page.locator(PANEL);
    await panel.waitFor();
    expect((await link.getAttribute("aria-expanded")) === "true", "link not aria-expanded");
    // Every citation links straight to its source.
    const cites = await panel.locator("sup a").evaluateAll((as) => as.map((a) => a.href));
    expect(cites.length >= traffic.summary.length + traffic.points.length, `only ${cites.length} citations`);
    expect(cites.every((h) => traffic.sources.some((s) => s.url === h)), `citation not to a source: ${cites.join(", ")}`);
    expect((await panel.getByRole("link", { name: "About this data →" }).count()) === 1, "no line to About this data");
    await wait(1200);
    const pad = await page.evaluate(() => window.__wgMap.getPadding());
    expect(pad.right > 300, `map not shifted clear of the panel: padding ${JSON.stringify(pad)}`);
    await page.keyboard.press("Escape");
    await wait(1200);
    expect((await panel.count()) === 0, "Esc didn't close the panel");
    const after = await page.evaluate(() => window.__wgMap.getPadding());
    expect(after.right === 0, `padding not reset: ${JSON.stringify(after)}`);
  });

  test("laptop why this matters: a linked map switches the map and closes the panel", async (o) => {
    const { page } = await o("laptop", "/map?d=traffic_fatalities&context=preview");
    await page.locator(`${CARD} [data-context-link]`).click();
    await page.locator('[data-linked-map="vmt_per_capita"]').click();
    await page.waitForURL(/d=vmt_per_capita/, { timeout: 10000 });
    expect((await page.locator(PANEL).count()) === 0, "panel still open after switching maps");
    expect((await page.locator("[data-context-link]").count()) === 0, "a map without context shows the link");
  });

  test("phone why this matters: a bottom sheet that leaves the map visible", async (o) => {
    const { page } = await o("phone", "/map?d=traffic_fatalities&context=preview");
    await page.locator(`${CARD} [data-context-link]`).click();
    const sheet = page.locator(PANEL);
    await sheet.waitFor();
    await wait(400);
    const box = await sheet.boundingBox();
    expect(box && box.height < 844 * 0.56, `sheet covers too much of the map: ${JSON.stringify(box)}`);
    expect((await sheet.locator("sup a").count()) >= traffic.summary.length, "summary citations missing in the sheet");
    await sheet.getByRole("button", { name: "Close why this matters" }).click();
    await wait(200);
    expect((await sheet.count()) === 0, "close button didn't close the sheet");
  });

  for (const vp of ["phone", "laptop"]) {
    test(`${vp} why this matters: no link on a map without context, or on a draft without the preview switch`, async (o) => {
      const { page } = await o(vp, "/map?d=pct_poverty&context=preview");
      expect((await page.locator("[data-context-link]").count()) === 0, "link on a map without context");
      const { page: plain } = await o(vp, "/map?d=traffic_fatalities");
      const n = await plain.locator("[data-context-link]").count();
      expect(n === (traffic?.approved ? 1 : 0), `draft context visible without ?context=preview (${n} links)`);
    });
  }
}
