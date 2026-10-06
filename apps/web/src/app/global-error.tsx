"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";
import "./globals.css";

// Last-resort screen when the root layout itself fails; it must render its own <html>.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-full">
        <main className="mx-auto max-w-3xl px-4 py-16 md:px-8">
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-2 max-w-prose text-muted-foreground">Mapwich hit an error. Trying again often fixes it.</p>
          <button type="button" onClick={() => retry()} className="mt-6 inline-block rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-muted">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
