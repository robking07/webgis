import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint 10 removed context.getFilename(), which eslint-plugin-react's React-version detection
  // still calls. Naming the version skips detection.
  { settings: { react: { version: "19" } } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // MapLibre's bundled worker files, copied in by scripts/prepare.mts (gitignored).
    "public/maplibre/**",
  ]),
]);

export default eslintConfig;
