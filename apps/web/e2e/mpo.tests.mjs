// MPOs in search (issue #276), registered by menus.spec.mjs: picking one outlines the whole area
// and names it; the share URL reopens it; a click on the map never selects it.
import { readFileSync } from "node:fs";
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

  // #393: a shared MPO link frames the area like a search pick; an at= in the link wins.
  for (const vp of ["laptop", "phone"]) {
    test(`${vp} shared MPO link: frames the area (no at=), and keeps an at= view`, async (o) => {
      const { page } = await o(vp, `/map?d=pct_poverty&mpo=${MET_COUNCIL}`);
      await outlined(page);
      await page.waitForFunction(() => window.__wgMap.getZoom() > 6, null, { timeout: 15000 });
      await mapIdle(page);
      const c = await page.evaluate(() => { const m = window.__wgMap.getCenter(); return [m.lng, m.lat]; });
      expect(Math.abs(c[0] + 93.3) < 1.5 && Math.abs(c[1] - 45) < 1.5, `not centred on the Twin Cities: ${c}`);
      const { page: kept } = await o(vp, `/map?d=pct_poverty&mpo=${MET_COUNCIL}&at=-100.0000,40.0000,4.00`);
      await outlined(kept);
      await mapIdle(kept);
      const z = await kept.evaluate(() => window.__wgMap.getZoom());
      expect(Math.abs(z - 4) < 0.1, `at= not kept, zoom ${z}`);
    });
  }

  // #292, #390: the focused MPO's total is its whole counties' counts plus the tracts inside the counties
  // its boundary cuts, with a margin, marked near-exact; a median says it can't be added up.
  test("laptop MPO total: Met Council's poverty count is 7 counties plus Sherburne and Wright tracts, ± shown, near-exact; a median has no total", async (o) => {
    const SEVEN = ["27003", "27019", "27037", "27053", "27123", "27139", "27163"];
    const T = "https://tiles.mapwich.org/values/";
    const counts = await (await fetch(T + "pct_poverty/county.counts.json")).json();
    const cut = JSON.parse(readFileSync(new URL("../public/mpo/counties.json", import.meta.url), "utf8"))[MET_COUNCIL].filter((c) => c[2]);
    let n = SEVEN.reduce((a, g) => a + counts[g][0], 0);
    for (const [g, , tracts] of cut) {
      const t = (await (await fetch(`${T}counts/tract/${g}.json`)).json()).pct_poverty;
      n += tracts.reduce((a, k) => a + t[k][0], 0);
    }
    const sum = n.toLocaleString("en-US");
    const { page } = await o("laptop", `/map?d=pct_poverty&mpo=${MET_COUNCIL}`);
    const row = page.locator('[data-region-dataset="pct_poverty"]');
    await row.waitFor({ timeout: 15000 });
    const text = await row.innerText();
    expect(text.includes(sum), `total ${sum} not in: ${text}`);
    expect(/%\s*±[\d.]+%/.test(text) && /\d ±[\d,]+ people below the poverty line/.test(text), `no margin in: ${text}`);
    const box = page.locator("[data-region-total]");
    expect((await box.getAttribute("data-region-total")) === "near-exact", "Met Council's MPO boundary cuts Sherburne and Wright, so their tracts inside are added");
    const status = await box.locator("[data-region-status]").innerText();
    expect(/^Near-exact \(tracts\) · 7 whole counties and tracts inside Sherburne and Wright$/.test(status), `status: ${status}`);
    // The full method sits behind a closed "How this is counted" disclosure.
    const method = box.locator("[data-region-method]");
    expect(!(await method.evaluate((d) => d.open)), "the method starts closed");
    await method.locator("summary").click();
    expect(/Hennepin/.test(await method.innerText()) && /population center/.test(await method.innerText()), "the method lists the counties and the tract rule");

    const { page: median } = await o("laptop", `/map?d=median_household_income&mpo=${MET_COUNCIL}`);
    await median.locator("[data-region-total]").waitFor({ timeout: 15000 });
    expect(/can’t be added up/i.test(await median.locator("[data-region-total]").innerText()), "a median shows no total");
  });

  // #365: a Minnesota MPO's panel lists its four plans (open on desktop, closed on phones); a site that
  // blocks scripts reads as such; an MPO outside Minnesota has no Plans block at all.
  for (const vp of ["laptop", "phone"]) {
    test(`${vp} MPO plans: Met Council shows 4 plan rows with source, check date, Mapwich's copy and Wayback; SCAG shows none`, async (o) => {
      const { page } = await o(vp, `/map?d=pct_poverty&mpo=${MET_COUNCIL}`);
      const plans = page.locator("[data-mpo-plans]");
      await plans.waitFor({ timeout: 15000 });
      await page.waitForTimeout(300); // a phone closes it right after the first render
      expect((await plans.evaluate((d) => d.open)) === (vp !== "phone"), `${vp}: Plans open = ${await plans.evaluate((d) => d.open)}`);
      if (vp === "phone") await plans.locator("> summary").click();
      const rows = plans.locator("[data-plan]");
      expect((await rows.count()) === 4, `rows: ${await rows.count()}`);
      const lr = plans.locator('[data-plan="longRange"]');
      await lr.locator("summary").click();
      const text = await lr.innerText();
      expect(/Imagine 2050/.test(text) && /Checked on \w+ \d+, \d{4}/.test(text), `long-range row: ${text}`);
      expect(await lr.locator('a[href^="https://tiles.mapwich.org/plans/27197300/"]').count() === 1, "no Mapwich copy link");
      expect(await lr.locator('a[href^="https://web.archive.org/"]').count() === 1, "no Wayback link");

      const { page: lax } = await o(vp, "/map?d=pct_poverty&mpo=55196700");
      const grants = lax.locator('[data-mpo-plans] [data-plan="grants"]');
      await grants.waitFor({ state: "attached", timeout: 15000 });
      expect(/the site blocks automatic checks/.test(await grants.textContent()), "La Crosse's blocked grants page isn't explained");
      expect(!/broken/i.test(await lax.locator("[data-mpo-plans]").textContent()), "says broken");

      const { page: scag } = await o(vp, "/map?d=pct_poverty&mpo=06197501");
      await scag.locator("[data-focus-name]").waitFor({ timeout: 15000 });
      await scag.waitForTimeout(1500);
      expect(await scag.locator("[data-mpo-plans]").count() === 0, "an MPO outside Minnesota shows a Plans block");
    });
  }
}
