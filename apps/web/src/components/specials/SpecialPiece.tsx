// A Special's own page, direction A (D-115): headline block, the map, Robbie's text beside the data
// boxes, how it was made with full citations, and more pieces.
import Link from "next/link";
import { DATASET_BY_ID } from "@/lib/registry";
import { INSIGHT_BY_ID } from "@/lib/insights";
import { SPECIALS, formatDate, renderMarkdown, type Special } from "@/lib/specials";
import { SiteFooter } from "@/components/SiteNav";
import { SpecialMap } from "./SpecialMap";
import { DataBox, DraftTag, LineUpBox, SpecialCard, mapHref, midSentence } from "./parts";

export function SpecialPiece({ special: s }: { special: Special }) {
  const [x, y] = s.datasets.map((id) => DATASET_BY_ID.get(id)!);
  const pairing = s.pairing ? INSIGHT_BY_ID.get(s.pairing) ?? null : null;
  const caption = s.caption ?? `${x.title}${y ? ` and ${midSentence(y.title)}` : ""} by county${pairing ? `, for ${pairing.n.toLocaleString()} counties with both values` : ""}.`;
  const more = SPECIALS.filter((o) => o.slug !== s.slug).slice(0, 3);
  const openMap = "h-12 items-center justify-center rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground hover:opacity-90 md:h-11 md:text-[15px]";

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-7 px-4 pt-5 pb-12 md:gap-10 md:px-8 md:pt-8 md:pb-16">
      <div className="flex max-w-[820px] flex-col gap-3 md:gap-3.5">
        <Link href="/specials" className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-primary hover:underline md:text-sm">← Specials</Link>
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-primary md:text-[13px]">
          {s.topic} {s.draft && <DraftTag />}
        </p>
        <h1 className="text-[32px] leading-[1.12] font-extrabold tracking-tight md:text-[52px] md:leading-[1.08]">{s.title}</h1>
        <p className="text-lg leading-normal text-foreground/80 md:text-[21px]">{s.dek}</p>
        <p className="text-[13px] text-muted-foreground md:text-sm">By {s.author} · {formatDate(s.date)} · {s.minutes} min read</p>
      </div>

      <figure className="flex flex-col gap-2.5">
        <SpecialMap datasets={s.datasets} at={s.at} className="aspect-[4/3] md:aspect-[16/7]">
          <Link href={mapHref(s)} className={`absolute top-4 right-4 z-10 hidden md:inline-flex ${openMap}`}>Open in the full map</Link>
        </SpecialMap>
        <Link href={mapHref(s)} className={`flex md:hidden ${openMap}`}>Open in the full map</Link>
        <figcaption className="text-[13px] leading-normal text-muted-foreground">{caption}</figcaption>
      </figure>

      <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-16">
        <article className="wg-prose min-w-0 max-w-[700px]" dangerouslySetInnerHTML={{ __html: s.html }} />
        <aside aria-label="About the data" className="flex flex-col gap-4">
          <DataBox special={s} />
          {pairing && <LineUpBox insight={pairing} />}
        </aside>
      </div>

      <section aria-labelledby="made" className="flex max-w-[820px] flex-col gap-2.5 rounded-xl border bg-card px-4 py-5 md:px-6 md:py-[22px]">
        <h2 id="made" className="text-lg font-bold">How this was made</h2>
        <p className="text-[15px] leading-relaxed text-foreground/85">
          {y
            ? "Each county is colored by where it falls on both measures: three groups for each, nine colors in all."
            : `Each county is colored by which of the map's groups its ${midSentence(x.title)} value falls in.`}
          {pairing && " The strength of the link is a rank correlation (Spearman ρ) across all counties with both values."}
        </p>
        {s.method && <div className="wg-prose wg-prose-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(s.method) }} />}
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">Sources</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-[18px] text-sm leading-normal text-foreground/85">
          {[x, y].filter(Boolean).map((d) => (
            <li key={d!.id}><a href={d!.source.url} className="hover:underline">{d!.source.citation}</a></li>
          ))}
        </ul>
      </section>

      {more.length > 0 && (
        <section aria-labelledby="more" className="flex flex-col gap-2 border-t pt-6 md:gap-[18px]">
          <h2 id="more" className="text-[19px] font-bold md:text-xl">More Specials</h2>
          <div className="flex flex-col md:grid md:grid-cols-3 md:gap-6">
            {more.map((o) => <SpecialCard key={o.slug} special={o} />)}
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
