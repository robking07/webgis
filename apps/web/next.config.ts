import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@webgis/design", "@webgis/registry"],
};

export default nextConfig;
