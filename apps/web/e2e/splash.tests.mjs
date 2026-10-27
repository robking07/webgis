// Splash questions (issue #224), registered by menus.spec.mjs, which owns the browser, server and
// helpers. Approved 2026-10-27, so bare / shows them too (D-193 test); ?splash=preview still works.
const { default: splash } = await import(new URL("../src/generated/splash.json", import.meta.url), { with: { type: "json" } });

const Q = "[data-splash-question]";
/** The content-file question a shown one came from ("{county}" filled with any county). */
const source = (text) => splash.questions.find((q) => new RegExp(`^${q.text.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace("{county}", ".+")}$`).test(text));

export default function splashTests({ test, expect, wait }) {
  for (const vp of ["phone", "monitor"]) {
    test(`${vp} splash preview: a question types out, is a link, and opens its map`, async (o) => {
      const { page } = await o(vp, "/?splash=preview", { ready: false });
      const link = page.locator(Q);
      await link.waitFor({ timeout: 10000 });
      const text = await link.getAttribute("aria-label");
      const q = source(text);
      expect(!!q, `"${text}" isn't in content/splash/questions.yaml`);
      // Typing: the visible part grows; the layout doesn't move while it does.
      const box = async () => (await page.locator("main svg").first().boundingBox()).y;
      const y0 = await box();
      await wait(1500);
      const typed = (await link.innerText()).replace(/_?\s*→?\s*$/, ""); // the cursor and the arrow
      expect(typed.length > 0 && text.startsWith(typed), `typed "${typed}" isn't the start of "${text}"`);
      expect(Math.abs((await box()) - y0) < 1, "the logo moved while the question typed");
      await link.hover();
      const held = await link.getAttribute("aria-label"); // the one under the pointer (it may have moved on)
      const q2 = source(held);
      await wait(4000); // longer than the hold: hovering keeps it on screen
      expect((await link.getAttribute("aria-label")) === held, "the question changed under the pointer");
      const want = new URL(q2.link, "https://x");
      expect(new URL(await link.getAttribute("href"), "https://x").pathname === want.pathname, `link for ${q2.link}`);
      await link.click();
      await page.waitForURL((u) => u.pathname === want.pathname, { timeout: 15000 });
      const u = new URL(page.url());
      expect(u.searchParams.get("d") === want.searchParams.get("d"), `opened d=${u.searchParams.get("d")}, wanted ${want.searchParams.get("d")}`);
      if (want.searchParams.get("b")) expect(u.searchParams.get("b") === want.searchParams.get("b"), `opened b=${u.searchParams.get("b")}`);
      if (q2.county) expect(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,8(\.0+)?$/.test(u.searchParams.get("at") ?? ""), `county question opened at=${u.searchParams.get("at")}`);
    });
  }

  test("laptop splash preview: keyboard reaches the question and Enter opens it", async (o) => {
    const { page } = await o("laptop", "/?splash=preview", { ready: false });
    await page.locator(Q).waitFor({ timeout: 10000 });
    await page.keyboard.press("Tab");
    expect(await page.locator(Q).evaluate((a) => a === document.activeElement), "Tab didn't reach the question");
    const href = await page.locator(Q).getAttribute("href");
    await page.keyboard.press("Enter");
    await page.waitForURL((u) => u.pathname === new URL(href, "https://x").pathname, { timeout: 15000 });
  });

  test("phone splash preview, reduced motion: a static list of links, no typing", async (o) => {
    const { page } = await o("phone", "/", { ready: false });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(page.url().replace("/?", "/?splash=preview&"));
    const items = page.locator("main ul a");
    await items.first().waitFor({ timeout: 10000 });
    expect((await items.count()) >= 3, `only ${await items.count()} questions listed`);
    expect((await page.locator(Q).count()) === 0, "typing question shown with reduced motion");
    for (const t of await items.allInnerTexts()) expect(!!source(t.replace(/\s*→$/, "")), `"${t}" isn't in the content file`);
  });
}
