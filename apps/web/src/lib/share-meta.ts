// Open Graph + Twitter card metadata for a page (issue #37). Relative image paths resolve against
// metadataBase (https://mapwich.org, set in the root layout). A page's `openGraph` replaces the
// layout's whole object, so every page that sets a title here sets image and site name too.
import type { Metadata } from "next";

export const SITE_URL = "https://mapwich.org";
export const HOME_CARD = "/og/home";

export function shareMeta({ title, description, path, image = HOME_CARD }: { title: string; description: string; path?: string; image?: string }): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { type: "website", siteName: "Mapwich", title, description, images: [image], ...(path ? { url: path } : {}) },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
