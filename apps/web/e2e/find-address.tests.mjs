// Find an address (issue #363), registered by menus.spec.mjs: a typed address goes to our /api/geocode
// (stubbed here, so CI never calls the Census Bureau), drops a pin and opens that tract's details on the
// map already showing; "asthma in Duluth" opens Asthma there; phones' Near me finds the tract on the
// device, sending the position nowhere.
export default function findAddressTests({ test, expect, mapIdle, HENNEPIN }) {
  const ADDRESS = "3400 Vicksburg Ln N, Plymouth, MN";
  const search = async (page, q) => {
    await page.keyboard.press("/");
    const dlg = page.getByRole("dialog", { name: "Search places and datasets" });
    await dlg.getByRole("combobox").fill(q);
    return dlg;
  };
  const details = (page) => page.getByRole("region", { name: /^Details for Census tract/ });
  const pinned = (page) => page.waitForFunction(() => window.__wgMap.querySourceFeatures("pin").length > 0, null, { timeout: 15000 });

  for (const vp of ["laptop", "phone"]) {
    test(`${vp} find an address: pin, that tract's details, same map, note shown`, async (o) => {
      const { page } = await o(vp, "/map?d=mean_commute_minutes");
      const sent = [];
      await page.route("**/api/geocode", async (r) => {
        sent.push(r.request().postDataJSON());
        await r.fulfill({ json: { match: { address: "3400 VICKSBURG LN N, PLYMOUTH, MN, 55447", lon: HENNEPIN[0], lat: HENNEPIN[1] } } });
      });
      const dlg = await search(page, ADDRESS);
      expect(await dlg.getByText("Addresses are looked up by the Census Bureau's public geocoder").isVisible(), "no geocoder note under the search box");
      await dlg.getByRole("option", { name: "Find this address" }).click();
      await details(page).waitFor({ timeout: 30000 });
      await pinned(page);
      expect(sent.length === 1 && sent[0].q === ADDRESS, `sent ${JSON.stringify(sent)}`);
      expect(new URL(page.url()).searchParams.get("d") === "mean_commute_minutes", `map switched to ${new URL(page.url()).searchParams.get("d")}`);
      expect(!page.requests.some((u) => u.includes("geocoding.geo.census.gov")), "the browser called the Census geocoder directly");
    });
  }

  test("laptop find an address: no match says so and keeps search open", async (o) => {
    const { page } = await o("laptop", "/map?d=mean_commute_minutes");
    await page.route("**/api/geocode", (r) => r.fulfill({ json: { match: null } }));
    const dlg = await search(page, "1 Nowhere Rd, Zzz");
    await dlg.getByRole("option", { name: "Find this address" }).click();
    await dlg.getByRole("option", { name: "No match for that address" }).waitFor({ timeout: 5000 });
  });

  test("laptop search: \"asthma in Duluth\" opens Asthma framed on Duluth", async (o) => {
    const { page } = await o("laptop", "/map?d=mean_commute_minutes");
    const dlg = await search(page, "asthma in Duluth");
    await dlg.getByRole("option", { name: /^Asthma.* in Duluth/ }).click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get("d") === "asthma", null, { timeout: 15000 });
    await mapIdle(page);
    const c = await page.evaluate(() => window.__wgMap.getCenter());
    expect(Math.abs(c.lng + 92.1) < 0.6 && Math.abs(c.lat - 46.8) < 0.5, `not on Duluth: ${c.lng}, ${c.lat}`);
  });

  test("phone Near me: frames the tract from the map's own tiles, sends the position nowhere", async (o) => {
    const { ctx, page } = await o("phone", "/map?d=mean_commute_minutes");
    await ctx.grantPermissions(["geolocation"]);
    await ctx.setGeolocation({ longitude: HENNEPIN[0], latitude: HENNEPIN[1] });
    await page.getByRole("button", { name: "Near me" }).click();
    await page.getByText("Your location stays on your device.").waitFor({ timeout: 5000 });
    await details(page).waitFor({ timeout: 30000 });
    await pinned(page);
    const lon = HENNEPIN[0].toFixed(2);
    expect(!page.requests.some((u) => u.includes("/api/geocode") || u.includes(lon)), "a request carried the position");
  });

  test("laptop: no Near me button on desktop", async (o) => {
    const { page } = await o("laptop", "/map?d=mean_commute_minutes");
    expect(!(await page.getByRole("button", { name: "Near me" }).count()), "Near me shows on desktop");
  });
}
