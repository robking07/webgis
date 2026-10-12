// "Why this matters" (issue #115): content/context/*.yaml, checked by lib/context-load.mts in
// scripts/prepare.mts. Production builds contain only approved context; other builds also carry the
// drafts, which show only with ?context=preview.
import data from "@/generated/context.json";
// Type-only: the loader itself reads the disk and never reaches the browser.
import type { MapContext } from "./context-load.mts";

export type { MapContext } from "./context-load.mts";

const BY_ID = new Map((data as unknown as MapContext[]).map((c) => [c.id, c]));

/** The context to show for a map, or null. `preview`: drafts too (the ?context=preview switch). */
export const contextFor = (id: string, preview: boolean) => {
  const c = BY_ID.get(id);
  return c && (c.approved || preview) ? c : null;
};
