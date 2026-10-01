import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@webgis/design", "@webgis/registry"],
  // "Insights" became "Specials" (D-31); keep old links working.
  async redirects() {
    return [
      { source: "/insights", destination: "/specials", permanent: true },
      { source: "/insights/:id", destination: "/specials/:id", permanent: true },
    ];
  },
};

export default nextConfig;
