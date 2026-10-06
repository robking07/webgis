"use client";
import { useState } from "react";
import type { GeoLevel } from "@webgis/design";
import { buildCsv, csvFileName, CSV_LEVEL_LABEL } from "@/lib/csv";
import type { Dataset } from "@/lib/registry";

/** One quiet button per geography level; the file is built only when tapped. */
export function CsvDownload({ dataset, levels }: { dataset: Dataset; levels: GeoLevel[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(level: GeoLevel) {
    setBusy(level); setError(null);
    try {
      const { blob } = await buildCsv(dataset, level);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = csvFileName(dataset, level);
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setError(`Couldn’t prepare the ${CSV_LEVEL_LABEL[level].toLowerCase()} file. Try again.`);
    } finally { setBusy(null); }
  }

  return (
    <section aria-labelledby="download" className="mb-8">
      <h2 id="download" className="mb-2 text-base font-semibold">Download</h2>
      <ul className="flex flex-wrap gap-2">
        {levels.map((l) => (
          <li key={l}>
            <button type="button" onClick={() => download(l)} disabled={busy !== null} aria-busy={busy === l}
              className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {busy === l ? "Preparing…" : `${CSV_LEVEL_LABEL[l]} (CSV)`}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground" role="status">{error ?? "Opens in Excel or Google Sheets. Source and citation are noted at the end of each file."}</p>
    </section>
  );
}
