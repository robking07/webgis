import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteNav";

export const metadata: Metadata = { title: "Page not found · Mapwich" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">There&apos;s no page at this address</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          The link may be old, or a dataset or place ID may be mistyped.
        </p>
        <ul className="mt-6 flex flex-wrap gap-3 text-sm">
          <li><Link href="/" className="inline-block rounded-md border bg-card px-3 py-1.5 hover:bg-muted">Back to the map</Link></li>
          <li><Link href="/specials" className="inline-block rounded-md border bg-card px-3 py-1.5 hover:bg-muted">Specials</Link></li>
          <li><Link href="/data" className="inline-block rounded-md border bg-card px-3 py-1.5 hover:bg-muted">All datasets</Link></li>
        </ul>
        <SiteFooter />
      </main>
    </>
  );
}
