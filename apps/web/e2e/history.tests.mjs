// Back button (issue #212), registered by menus.spec.mjs. Changing the dataset adds a Back step.
export default function historyTests({ test, expect, immerse, mapIdle }) {
  test("phone back: each dataset change is a Back step, and Back restores the previous map", async (o) => {
    const { page } = await o("phone", "/map?d=median_household_income&lv=county&at=-93.4752,45.0061,7.2");
    await immerse(page);
    const pick = async (category, name, id) => {
      await page.getByRole("button", { name: /other .* datasets/ }).click();
      const sheet = page.locator('section[aria-label="Dataset list"]');
      await sheet.locator("[role=radiogroup][aria-label=Categories] [role=radio]").filter({ hasText: category }).click();
      await sheet.getByRole("menuitemradio", { name }).first().click();
      await sheet.waitFor({ state: "detached" });
      await page.waitForFunction((d) => new URL(location.href).searchParams.get("d") === d, id);
    };
    const at = (id) => page.waitForFunction((d) => new URL(location.href).searchParams.get("d") === d, id);
    await pick("Transportation", /Work from home/i, "pct_work_from_home");
    await pick("Economy", /Population below poverty/i, "pct_poverty");
    await page.goBack();
    await at("pct_work_from_home");
    await mapIdle(page);
    expect((await page.locator("[data-dataset-heading]").innerText()).includes("from home"), "card didn't follow Back");
    await page.goBack();
    await at("median_household_income");
    expect(new URL(page.url()).pathname === "/map", `left the map: ${page.url()}`);
    await page.goForward();
    await at("pct_work_from_home");
  });
}
