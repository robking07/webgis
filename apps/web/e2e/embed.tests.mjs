// Share → Embed (issue #554), registered by menus.spec.mjs: the copied iframe opens the same view
// with only the map, legend, credits and a link out.
export default function embedTests({ test, expect, wait }) {
  test("laptop embed: Share → Embed copies an iframe whose page has no header or menus", async (o) => {
    const { page } = await o("laptop", "/map?d=median_household_income&at=-93.27,44.97,9");
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t) => { window.__copied = t; } } });
    });
    const card = page.locator('section[aria-label="Mapped dataset"]');
    await card.getByRole("button", { name: "Share this view" }).click();
    await card.getByRole("group", { name: "Share" }).getByRole("button", { name: "Embed" }).click();
    await wait(100);
    const snippet = await page.evaluate(() => window.__copied);
    const src = snippet?.match(/<iframe src="([^"]+)" title="Median household income[^"]*"/)?.[1]?.replaceAll("&amp;", "&");
    expect(src && new URL(src).searchParams.get("embed") === "1" && new URL(src).searchParams.get("at"), `snippet: ${snippet}`);

    await page.goto(src, { waitUntil: "load" });
    await page.waitForFunction(() => window.__wgMap?.loaded(), null, { timeout: 30000 });
    expect((await page.locator("header").count()) === 0, "header shown in the embed");
    expect((await page.locator('section[aria-label="Mapped dataset"]').count()) === 0, "dataset card shown in the embed");
    expect((await page.getByRole("button", { name: /Zoom in|Go to|Pick an area/ }).count()) === 0, "map controls shown in the embed");
    expect(/OpenStreetMap/.test(await page.locator(".wg-credits").innerText()), "credits lack OpenStreetMap");
    const out = page.getByRole("link", { name: /Open in Mapwich/ });
    expect((await out.getAttribute("target")) === "_blank" && !(await out.getAttribute("href")).includes("embed"), "no link out of the embed");
  });
}
