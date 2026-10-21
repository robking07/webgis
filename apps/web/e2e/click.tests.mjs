// Map clicks (issue #317), registered by menus.spec.mjs: one click selects and centers at the same
// zoom, Back recenters with no panel padding left (#180), a double click frames the place whole, and
// a double click on empty map still zooms in one step.
export default function clickTests({ test, expect, immerse, mapIdle, tapAt, HENNEPIN }) {
  const cam = (page) => page.evaluate(() => { const m = window.__wgMap, c = m.getCenter(); return { lon: c.lng, lat: c.lat, zoom: m.getZoom(), pad: m.getPadding() }; });
  const at = (page, lon, lat) => page.evaluate(([lon, lat]) => { const p = window.__wgMap.project([lon, lat]); return [p.x, p.y]; }, [lon, lat]);
  /** Hennepin's whole shape lies inside the view. */
  const fits = (page) => page.evaluate(() => {
    const m = window.__wgMap, v = m.getBounds();
    const pts = m.querySourceFeatures("b-county", { sourceLayer: "county" }).filter((f) => String(f.properties.geoid) === "27053")
      .flatMap((f) => f.geometry.coordinates.flat(f.geometry.type === "MultiPolygon" ? 2 : 1));
    return pts.length > 0 && pts.every(([x, y]) => x >= v.getWest() && x <= v.getEast() && y >= v.getSouth() && y <= v.getNorth());
  });

  for (const vp of ["phone", "laptop"]) {
    test(`${vp} map click: one click centers at the same zoom, Back clears the padding, double click fits`, async (o) => {
      // A county-only map: a click selects without drilling in.
      const { page } = await o(vp, `/map?d=asthma&at=${HENNEPIN[0] + 0.5},${HENNEPIN[1] + 0.2},8`);
      await immerse(page);
      const before = await cam(page);
      await tapAt(page, ...(await at(page, ...HENNEPIN)));
      await page.locator('section[aria-label^="Details for Hennepin County"]').waitFor();
      await mapIdle(page);
      const one = await cam(page);
      expect(Math.abs(one.zoom - before.zoom) < 0.01, `one click changed the zoom: ${before.zoom} → ${one.zoom}`);
      // The padded center (clear of the details) is on Hennepin, and the panel's side is padded.
      expect(Math.abs(one.lon - HENNEPIN[0]) < 0.2 && Math.abs(one.lat - HENNEPIN[1]) < 0.15, `not centered on Hennepin: ${JSON.stringify(one)}`);
      expect(vp === "phone" ? one.pad.bottom > 0 : one.pad.right > 0, `no padding for the details: ${JSON.stringify(one.pad)}`);
      await page.locator('button[aria-label="Back to the previous view"]').click();
      await mapIdle(page);
      const back = await cam(page);
      expect(Object.values(back.pad).every((v) => v === 0), `padding after Back: ${JSON.stringify(back.pad)}`);
      expect(Math.abs(back.zoom - before.zoom) < 0.01, `Back zoom ${back.zoom}, was ${before.zoom}`);
      // Double click: frames all of Hennepin, without MapLibre's extra zoom-in step on top.
      const [x, y] = await at(page, ...HENNEPIN);
      await tapAt(page, x, y, true);
      await page.locator('section[aria-label^="Details for Hennepin County"]').waitFor();
      await mapIdle(page);
      const two = await cam(page);
      expect(Math.abs(two.zoom - before.zoom) > 0.2, `double click kept the zoom (${two.zoom})`);
      expect(await fits(page), `Hennepin doesn't fit after a double click (zoom ${two.zoom})`);
      // Empty map (Ontario, no county): a double click zooms in one step, as MapLibre does.
      await page.locator('button[aria-label="Close details"]').click();
      await page.evaluate(() => window.__wgMap.jumpTo({ center: [-86, 51], zoom: 5, padding: { top: 0, right: 0, bottom: 0, left: 0 } }));
      await mapIdle(page);
      const { width, height } = page.viewportSize();
      await tapAt(page, width / 2, height / 2, true);
      await mapIdle(page);
      const empty = await cam(page);
      expect(Math.abs(empty.zoom - 6) < 0.05, `double click on empty map: zoom ${empty.zoom}, expected 6`);
    });
  }
}
