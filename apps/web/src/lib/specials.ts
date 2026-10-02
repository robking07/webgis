// Specials: pieces written as one Markdown file each in apps/web/content/specials/ (D-115).
// scripts/prepare.mts reads and checks them before every dev and build (lib/specials-load.mts) and
// writes src/generated/specials.json; this module serves that file to the pages, so nothing here
// reads the disk. Inline maps, charts and tables: D-122. Format: content/specials/README.md.
import { marked } from "marked";
import data from "@/generated/specials.json";
import type { Special } from "./specials-load.mts";

export type { Segment, Special } from "./specials-load.mts";

// Drafts show in local builds and Vercel previews, never on mapwich.org.
const SHOW_DRAFTS = process.env.VERCEL_ENV !== "production";

/** Newest first. Drafts are left out of production builds. */
export const SPECIALS: Special[] = (data as unknown as Special[]).filter((s) => SHOW_DRAFTS || !s.draft);

/** Markdown → HTML for short fields (method notes). */
export const renderMarkdown = (md: string) => marked.parse(md, { async: false });

export function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
