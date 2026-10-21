// Share button (issue #164), registered by menus.spec.mjs, which owns the browser, server and helpers.
// The clipboard and the share sheet are stubbed: headless Chromium has neither.
const SHARE = { name: "Share a link to this view" };
// The shared link leaves out theme= (D-266, #306): the page URL minus it.
const noTheme = (u) => { const x = new URL(u); x.searchParams.delete("theme"); return x.href; };
const stubClipboard = (page) => page.evaluate(() => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t) => { window.__copied = t; } } });
});

export default function shareTests({ test, expect, wait, mapIdle }) {
  test("laptop share: change map copies its link, says so, and the link restores the view", async (o) => {
    const { page } = await o("laptop", "/map?d=pct_poverty&since=2019&at=-93.27,44.97,9");
    await stubClipboard(page);
    const btn = page.locator('section[aria-label="Mapped dataset"]').getByRole("button", SHARE);
    await btn.click();
    await wait(100);
    const copied = await page.evaluate(() => window.__copied);
    expect(copied === noTheme(page.url()), `copied ${copied}, page is ${page.url()}`);
    expect(new URL(copied).searchParams.get("since") === "2019", `no since= in ${copied}`);
    expect((await btn.innerText()).trim() === "Link copied", `button says "${await btn.innerText()}"`);
    expect((await page.getByRole("status").filter({ hasText: "Link copied" }).count()) === 1, "copied state not in a live region");
    await wait(2300);
    expect((await btn.innerText()).trim() === "Share", `button didn't reset: "${await btn.innerText()}"`);
    // Open the copied link: same view.
    const before = await page.evaluate(() => [window.__wgMap.getZoom(), ...window.__wgMap.getCenter().toArray()]);
    await page.goto(copied, { waitUntil: "load" });
    await mapIdle(page);
    const after = await page.evaluate(() => [window.__wgMap.getZoom(), ...window.__wgMap.getCenter().toArray()]);
    expect(before.every((v, i) => Math.abs(v - after[i]) < 0.05), `view ${before} became ${after}`);
    expect(new URL(page.url()).searchParams.get("since") === "2019", `reopened without since=: ${page.url()}`);
  });

  test("phone share: opens the share sheet with the page link", async (o) => {
    const { page } = await o("phone", "/map?d=pct_poverty");
    await page.evaluate(() => { navigator.share = async (d) => { window.__shared = d; }; });
    await page.locator('section[aria-label="Mapped dataset"]').getByRole("button", SHARE).click();
    await wait(100);
    const shared = await page.evaluate(() => window.__shared);
    expect(shared?.url === noTheme(page.url()), `shared ${JSON.stringify(shared)}, page is ${page.url()}`);
  });

  test("laptop share: compare page copies its link", async (o) => {
    const { page } = await o("laptop", "/compare/27053/27123?d=pct_poverty", { ready: false });
    await stubClipboard(page);
    const btn = page.locator("main nav").getByRole("button", SHARE);
    await btn.focus();
    await page.keyboard.press("Enter");
    await wait(100);
    const copied = await page.evaluate(() => window.__copied);
    expect(copied === noTheme(page.url()) && copied.includes("/compare/27053/27123?d=pct_poverty"), `copied ${copied}`);
    expect((await btn.innerText()).trim() === "Link copied", `button says "${await btn.innerText()}"`);
  });
}
