import type { Metadata } from "next";
import Link from "next/link";
import { approvedInsights } from "@/lib/approvals";
import { pickInteresting } from "@/lib/insights";
import { LANDING } from "@/lib/landing";
import { SPECIALS, formatDate } from "@/lib/specials";
import { SiteFooter } from "@/components/SiteNav";
import { SiteHeader } from "@/components/SiteHeader";
import { SpecialMap } from "@/components/specials/SpecialMap";
import { DataBox, DraftTag, PairingsKey, PairingsList, SpecialCard, byline, mapHref, pairName } from "@/components/specials/parts";

export const metadata: Metadata = { title: "Specials · Mapwich" };

// The Specials front page, direction A (D-115): the latest piece over its map, earlier pieces, then
// the Combinations index. With no piece published yet it opens on Combinations.
export default async function SpecialsPage() {
  // Only cards Robbie approved (D-116).
  const published = await approvedInsights();
  const [lead, ...earlier] = SPECIALS;
  return (
    <>
      <SiteHeader current="specials" />
      <main className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 pt-6 pb-12 md:gap-14 md:px-8 md:pt-8 md:pb-16">
        <section aria-label={lead ? "Latest Special" : undefined} className="flex flex-col gap-4 md:gap-7">
          <h1 className="wg-wordmark text-[44px] leading-none font-extrabold tracking-[-0.02em] md:text-[64px]">Specials</h1>
          <a href="https://buymeacoffee.com/mapwich" target="_blank" rel="noopener" className="w-fit text-sm text-muted-foreground hover:text-foreground">Buy me a coffee</a>
          {lead && (
            <>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-12">
                <div className="flex min-w-0 flex-col gap-3">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-primary md:text-[13px]">
                    {lead.topic} · {formatDate(lead.date)} {lead.draft && <DraftTag />}
                  </p>
                  <h2 className="max-w-[780px] text-[28px] leading-[1.15] font-bold tracking-tight md:text-[44px] md:leading-[1.1]">
                    <Link href={`/specials/${lead.slug}`} className="hover:underline">{lead.title}</Link>
                  </h2>
                  <p className="max-w-[680px] text-[17px] leading-normal text-foreground/80 md:text-[19px]">{lead.dek}</p>
                  <p className="text-[13px] text-muted-foreground md:text-sm">{byline(lead.author)} · {lead.minutes} min read</p>
                  <div className="mt-1 flex flex-col gap-2.5 sm:flex-row sm:gap-3 md:mt-2">
                    <Link href={`/specials/${lead.slug}`} className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-[18px] text-base font-semibold text-primary-foreground hover:opacity-90 md:h-11 md:text-[15px]">Read the piece</Link>
                    <Link href={mapHref(lead)} className="inline-flex h-12 items-center justify-center rounded-lg border bg-card px-[18px] text-base font-medium text-foreground hover:bg-muted md:h-11 md:text-[15px]">Open this map</Link>
                  </div>
                </div>
                <aside aria-label="Data in this piece" className="hidden md:block"><DataBox special={lead} showOrigin /></aside>
              </div>
              <figure className="flex flex-col gap-3">
                <SpecialMap datasets={lead.datasets} at={lead.at} poster={lead.image} className="aspect-[4/3] md:aspect-[5/2]">
                  {LANDING.special === lead.slug && (
                    <span className="pointer-events-none absolute top-3 left-3 z-10 rounded-full bg-card/95 px-2.5 py-1 text-xs font-semibold tracking-wide md:top-4 md:left-4">On the map now</span>
                  )}
                </SpecialMap>
                <figcaption className="sr-only">{pairName(lead)}</figcaption>
              </figure>
              <details className="rounded-[10px] border bg-card md:hidden">
                <summary className="cursor-pointer px-4 py-3.5 text-sm font-semibold">Data in this piece</summary>
                <div className="px-1 pb-1 [&>div]:border-0"><DataBox special={lead} showOrigin /></div>
              </details>
            </>
          )}
        </section>

        {earlier.length > 0 && (
          <section aria-labelledby="earlier" className="flex flex-col gap-2 md:gap-[18px]">
            <h2 id="earlier" className="text-[19px] font-bold md:text-xl">Earlier Specials</h2>
            <div className="flex flex-col md:grid md:grid-cols-3 md:gap-6">
              {earlier.slice(0, 6).map((s) => <SpecialCard key={s.slug} special={s} />)}
            </div>
          </section>
        )}

        <section aria-labelledby="pairings" className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between md:gap-4">
            <div className="flex flex-col gap-1.5">
              <h2 id="pairings" className="text-[19px] font-bold md:text-xl">Combinations</h2>
              <p className="max-w-[640px] text-[13px] leading-normal text-muted-foreground md:text-sm">
                Datasets that line up across U.S. counties. Correlation is not causation; each pair passed automatic checks, then was read and approved by hand.
              </p>
              <PairingsKey />
            </div>
            <Link href="/specials/combinations" className="hidden whitespace-nowrap text-sm font-semibold text-primary hover:underline md:inline">All {published.length} combinations →</Link>
          </div>
          <PairingsList pairs={pickInteresting(published)} />
          <Link href="/specials/combinations" className="flex h-12 items-center justify-center text-[15px] font-semibold text-primary hover:underline md:hidden">All {published.length} combinations →</Link>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
