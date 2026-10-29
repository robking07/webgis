// Similar counties on a county's profile (#291): the five counties that rank closest across every
// county measure, worked out at ingest (`ingest similar`, D-499) and rendered on the server,
// so the browser fetches nothing extra. Each links to Compare, opened on a measure they share.
import SIMILAR from "@/generated/similar.json";
import { compareHref, shortName } from "@/lib/compare";
import { placeName } from "@/lib/place-name";
import { DATASET_BY_ID } from "@/lib/registry";

type Match = [string, number, number[], number[]];
const { measures, counties } = SIMILAR as unknown as { measures: string[]; counties: Record<string, Match[]> };
const titles = (idx: number[]) => idx.map((i) => DATASET_BY_ID.get(measures[i])?.title ?? measures[i]).join(", ");

export function SimilarPlaces({ geoid }: { geoid: string }) {
  const matches = (counties[geoid] ?? []).filter(([b]) => placeName(b));
  const name = placeName(geoid);
  if (!matches.length || !name) return null;
  return (
    <section aria-labelledby="similar-places" className="mb-6" data-similar-places="">
      <h2 id="similar-places" className="text-base font-semibold">Similar counties</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        The counties that rank closest to {shortName(name)} across {measures.length} measures, each counted equally.
        “Both high” or “both low” means both counties are in the top or bottom quarter of U.S. counties.
      </p>
      <ul className="mt-2 space-y-2">
        {matches.map(([b, , high, low]) => (
          <li key={b} className="text-sm">
            <a href={compareHref({ a: geoid, b, d: measures[high[0] ?? low[0]] ?? null })}
              className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
              {placeName(b)}
            </a>
            <span className="block text-xs text-muted-foreground">
              {[high.length && `Both high: ${titles(high)}.`, low.length && `Both low: ${titles(low)}.`].filter(Boolean).join(" ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
