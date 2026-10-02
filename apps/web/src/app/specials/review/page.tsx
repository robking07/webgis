import type { Metadata } from "next";
import { PairingReview } from "@/components/PairingReview";
import { SiteHeader } from "@/components/SiteHeader";

// Private review queue for Odd Pairings (D-116); kept out of search results.
export const metadata: Metadata = { title: "Review Odd Pairings · Mapwich", robots: { index: false, follow: false } };

export default function ReviewPage() {
  return (
    <>
      <SiteHeader current="specials" />
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Review Odd Pairings</h1>
        <p className="mb-6 max-w-2xl text-muted-foreground">
          Every pair that passed the automatic checks waits here. Only the ones you approve appear on Specials, and an approval lapses
          if the pair&apos;s numbers or wording change later.
        </p>
        <PairingReview />
      </main>
    </>
  );
}
