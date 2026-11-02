import { expect, it } from "vitest";
import { loadRegistry } from "@webgis/registry/load";
import { timelineStops } from "@webgis/registry/timeline";

it("climate timelines run 10-year averages from 1895, then single years from the normals period", () => {
  const e = loadRegistry().find((d) => d.id === "mean_temperature")!;
  const stops = timelineStops(e);
  expect(stops.slice(0, 3).map((s) => [s.id, s.label])).toEqual([["1900", "1895–1900 average"], ["1910", "1901–1910 average"], ["1920", "1911–1920 average"]]);
  expect(stops.filter((s) => s.span).at(-1)).toMatchObject({ id: "1990", span: [1981, 1990] });
  expect(stops.find((s) => s.id === "1991")?.span).toBeUndefined();
  expect(stops.at(-1)).toMatchObject({ id: "normal", isDefault: true });
});
