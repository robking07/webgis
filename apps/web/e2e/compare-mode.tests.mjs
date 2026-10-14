// Compare two maps as a mode you enter and leave (issue #198), registered by menus.spec.mjs.
export default function compareModeTests({ test, expect, immerse }) {
  const param = (page, k) => new URL(page.url()).searchParams.get(k);
  const until = (page, k, v) => page.waitForFunction(([k, v]) => new URL(location.href).searchParams.get(k) === v, [k, v]);

  for (const vp of ["laptop", "phone"]) {
    test(`${vp} compare mode: enter → strip → Swap → Change dataset asks → Exit; Back leaves compare`, async (o) => {
      const { page } = await o(vp, "/map?d=asthma");
      const card = page.locator('section[aria-label="Mapped dataset"]');
      const dialog = page.locator('section[role=dialog][aria-label="Datasets"]');
      expect(await card.locator("[data-compare-strip]").count() === 0, "strip shown before comparing");

      // Enter: Compare datasets → the picker greys out what can't pair, with the reason.
      await card.getByRole("button", { name: "Compare datasets" }).click();
      await dialog.getByRole("heading", { name: "Choose a second map" }).waitFor();
      await dialog.getByRole("searchbox").fill("Traffic volume");
      const road = dialog.getByRole("button", { name: /Traffic volume/ });
      expect(await road.isDisabled(), "a road layer is offered as a second map");
      expect((await road.innerText()).includes("can't be compared"), `no reason on the greyed-out map: ${await road.innerText()}`);
      await dialog.getByRole("searchbox").fill("Arthritis");
      await dialog.getByRole("button", { name: /Arthritis/ }).first().click();
      await until(page, "b", "arthritis");
      const strip = card.locator("[data-compare-strip]");
      expect(await strip.isVisible() && (await strip.innerText()).includes("Comparing"), "no compare strip");

      // Swap switches which map is first.
      await strip.getByRole("button", { name: /Swap/ }).click();
      await until(page, "d", "arthritis");
      expect(param(page, "b") === "asthma", `swap left b=${param(page, "b")}`);

      // Change dataset asks which map to replace, then opens the picker for it.
      await card.locator("[data-change-dataset]").click();
      await dialog.getByRole("heading", { name: "Replace which map?" }).waitFor();
      await dialog.getByRole("button", { name: /Asthma/ }).click();
      await dialog.getByRole("heading", { name: /^Replace .*Asthma/ }).waitFor();
      await dialog.getByRole("button", { name: "Close datasets" }).click();

      // Exit: back to the first map alone.
      await strip.getByRole("button", { name: /Exit/ }).click();
      await until(page, "b", null);
      expect(param(page, "d") === "arthritis", `exit changed the map: d=${param(page, "d")}`);
      expect(await card.locator("[data-compare-strip]").count() === 0, "strip still shown after Exit");

      // Back: before Exit (compare), before Swap, then before entering (single map).
      await page.goBack(); await until(page, "b", "asthma");
      await page.goBack(); await until(page, "b", "arthritis");
      await page.goBack(); await until(page, "b", null);
      expect(param(page, "d") === "asthma", `Back didn't return to the single map: ${page.url()}`);
    });
  }

  test("laptop compare mode: full screen folds the strip into the heading with an Exit button", async (o) => {
    const { page } = await o("laptop", "/map?d=asthma&b=arthritis&at=-93.27,44.97,7");
    await immerse(page);
    const exit = page.locator("[data-immersed-heading] [data-compare-exit]");
    await exit.click();
    await until(page, "b", null);
    expect(param(page, "d") === "asthma", "Exit changed the first map");
  });
}
