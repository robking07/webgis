import type { MetadataRoute } from "next";

// Pre-launch (D-1xx): only the splash page at / may be indexed. "$" ends the path match, which
// Google and Bing support, so "Allow: /$" is exactly "/" and "Disallow: /" covers the rest.
// Every other page also carries a noindex meta tag (root layout). No sitemap. Undo at roadmap 3.6.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/$", disallow: "/" } };
}
