import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteNav";
import { SiteHeader } from "@/components/SiteHeader";
import { DataDirectory } from "@/components/DataDirectory";

export const metadata: Metadata = { title: "Data · Mapwich", description: "Every dataset on Mapwich: source, vintage, geography, license and method." };

export default function DataPage() {
  return (
    <>
    <SiteHeader />
    <main className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Data</h1>
        <p className="mt-2 text-muted-foreground">
          Every dataset on the map, with where it comes from, how each value is computed, and what to watch out for.
          Most of it is public-domain U.S. government data; academic sources are credited on each dataset&apos;s page.
          Mapwich is a non-commercial, educational project.
        </p>
      </header>
      <DataDirectory />
      <SiteFooter />
    </main>
    </>
  );
}
