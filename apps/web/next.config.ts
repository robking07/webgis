import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inline an empty DSN when unset so the Sentry SDK is dropped from the client bundle (S3).
  env: { NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "" },
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@webgis/design", "@webgis/registry"],
  // Share cards read their font files with fs at request time (D-165); bundle them.
  outputFileTracingIncludes: {
    "/og/**": ["./src/assets/fonts/**"],
  },
  // "Insights" became "Specials" (D-31); keep old links working.
  async redirects() {
    // The map moved from / to /map (D-193). A request to / carrying any map-view parameter keeps
    // working: Next passes the query string through to the destination. Bare / is the splash page.
    const oldMapLinks = ["d", "b", "at", "lv", "t"].map((key) => ({
      source: "/", has: [{ type: "query" as const, key }], destination: "/map", permanent: false,
    }));
    return [
      ...oldMapLinks,
      { source: "/insights", destination: "/specials", permanent: true },
      { source: "/insights/:id", destination: "/specials/:id", permanent: true },
    ];
  },
};

export default nextConfig;
