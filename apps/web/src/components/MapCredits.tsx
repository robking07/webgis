// Map credits as a footnote (D-35): small, low-contrast, under the legend and scale bar.
// Replaces MapLibre's attribution box; the basemap credit (OpenStreetMap et al.) stays visible.
import type { Dataset } from "@/lib/registry";

export function MapCredits({ datasets }: { datasets: Dataset[] }) {
  return (
    <p className="wg-credits pointer-events-auto absolute inset-x-3 bottom-1 z-10 truncate text-[10px] leading-tight md:left-4 md:right-4 lg:whitespace-normal">
      {datasets.map((d) => (
        <span key={d.id}><a href={`/data/${d.id}`}>{d.source.name.split(" (")[0]}</a> · </span>
      ))}
      Boundaries <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html" target="_blank" rel="noopener">U.S. Census Bureau</a>
      {" · "}<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>
      {" © "}<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a>
      {" © "}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>
    </p>
  );
}
