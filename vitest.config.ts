// Unit tests (S1): `npm test` at the repo root. Fast, no network, no browser; the e2e click-through
// (apps/web/e2e) covers the running app.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)) } },
  test: {
    include: ["apps/*/src/**/*.test.ts", "packages/*/src/**/*.test.ts", "data/*/src/**/*.test.ts"],
    environment: "node",
  },
});
