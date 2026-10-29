// MPOs in search (issue #276), registered by menus.spec.mjs: picking one outlines the whole area
// and names it; the share URL reopens it; a click on the map never selects it.
export default function mpoTests({ test, expect, mapIdle, tapLonLat, HENNEPIN }) {
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
      if (vp === "phone") { // #392: the chip's ✕ is a 44 px target that Near me doesn't sit on
        const x = await shared.locator("[data-focus-name] button").boundingBox();
        const near = await shared.getByRole("button", { name: "Near me" }).boundingBox();
        expect(x.width >= 44 && x.x + x.width <= near.x || x.y + x.height <= near.y || near.y + near.height <= x.y, `✕ ${JSON.stringify(x)} overlaps Near me ${JSON.stringify(near)}`);
      }
      await shared.locator("[data-focus-name] button").click();
      await shared.waitForFunction(() => !new URL(location.href).searchParams.get("mpo"), null, { timeout: 5000 });
      await shared.waitForFunction(() => !window.__wgMap.getLayer("area-highlight"), null, { timeout: 5000 });
    });

    test(`${vp} MPO search: a pick fits the whole area below the heading (small, two-state and huge MPOs)`, async (o) => {
      const { page } = await o(vp, "/map?d=pct_poverty");
      for (const [q, re] of [["Fargo-Moorhead", /^Fargo-Moorhead/], ["Metropolitan Council", /^Metropolitan Council\s*MPO$/], ["Southern California Association", /^Southern California Association/]]) {
        await page.keyboard.press("/");
        const dlg = page.getByRole("dialog", { name: "Search places and datasets" });
        await dlg.getByRole("combobox").fill(q);
        await dlg.getByRole("region", { name: "Places" }).getByRole("option", { name: re }).first().click();
        await outlined(page);
        await mapIdle(page);
        // The MPO's bbox corners, projected, lie inside the map below or beside the heading (its name
        // chip): with the area's totals open (#292) the heading is tall, so the fit may clear it on the left.
        const r = await page.evaluate(async () => {
          const id = new URL(location.href).searchParams.get("mpo");
          const row = (await (await fetch("/mpo/index.json")).json()).find((x) => x[2] === id);
          const [w, s, e, n] = row[7], m = window.__wgMap;
          const a = m.project([w, n]), b = m.project([e, s]);
          const chip = document.querySelector("[data-focus-name]").getBoundingClientRect();
          return { id, left: a.x, top: a.y, right: b.x, bottom: b.y, headBottom: chip.bottom, headRight: chip.right, W: innerWidth, H: innerHeight };
        });
        expect(r.left >= 0 && r.right <= r.W && (r.top >= r.headBottom || r.left >= r.headRight) && r.bottom <= r.H, `${q} (${r.id}) not fitted: ${JSON.stringify(r)}`);
      }
    });
  }

  // #292: the focused MPO's total is its counties' counts added up, with a margin, marked approximate
  // where the boundary cuts a county; a median says it can't be added up.
  test("laptop MPO total: Met Council's poverty count is its 7 counties summed, ± shown, approximate; a median has no total", async (o) => {
    const SEVEN = ["27003", "27019", "27037", "27053", "27123", "27139", "27163"];
    const counts = await (await fetch("https://tiles.mapwich.org/values/pct_poverty/county.counts.json")).json();
    const sum = SEVEN.reduce((a, g) => a + counts[g][0], 0).toLocaleString("en-US");
    const { page } = await o("laptop", `/map?d=pct_poverty&mpo=${MET_COUNCIL}`);
    const row = page.locator('[data-region-dataset="pct_poverty"]');
    await row.waitFor({ timeout: 15000 });
    const text = await row.innerText();
    expect(text.includes(sum), `total ${sum} not in: ${text}`);
    expect(/%\s*±[\d.]+%/.test(text) && /\d ±[\d,]+ people below the poverty line/.test(text), `no margin in: ${text}`);
    const box = page.locator("[data-region-total]");
    expect((await box.getAttribute("data-region-total")) === "approximate", "Met Council's MPO boundary cuts Sherburne and Wright, so the total is approximate");
    const status = await box.locator("[data-region-status]").innerText();
    expect(/^Approximate · 7 counties; leaves out parts of Sherburne and Wright$/.test(status), `status: ${status}`);
    // The full method sits behind a closed "How this is counted" disclosure.
    const method = box.locator("[data-region-method]");
    expect(!(await method.evaluate((d) => d.open)), "the method starts closed");
    await method.locator("summary").click();
    expect(/Hennepin/.test(await method.innerText()) && /at least half/.test(await method.innerText()), "the method lists the counties and the rule");

    const { page: median } = await o("laptop", `/map?d=median_household_income&mpo=${MET_COUNCIL}`);
    await median.locator("[data-region-total]").waitFor({ timeout: 15000 });
    expect(/can’t be added up/i.test(await median.locator("[data-region-total]").innerText()), "a median shows no total");
  });
}
