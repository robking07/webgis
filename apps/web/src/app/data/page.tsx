import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { DataDirectory } from "@/components/DataDirectory";

export const metadata: Metadata = { title: "Data · webgis", description: "Every dataset on webgis: source, vintage, geography, license and method." };

export default function DataPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <SiteNav current="data" />
      <header className="mb-6 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Data</h1>
        <p className="mt-2 text-muted-foreground">
          Every dataset on the map, with where it comes from, how each value is computed, and what to watch out for.
          All of it is free, public-domain U.S. government data.
        </p>
      </header>
      <DataDirectory />
    </main>
  );
}
