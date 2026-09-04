import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Flat config. `eslint-config-next@16` ships native flat config arrays, so no
 * FlatCompat shim is needed.
 */
const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-dev/**",
      "out/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      /**
       * Data boundary: pages, components and features talk to
       * `loadCatalog()`, never to the generated wireframe fixture.
       * Only `src/lib/catalog/fixture.ts` (the adapter), the fixture
       * modules themselves and tests may reach into `@/data/wireframe`.
       */
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/data/wireframe", "@/data/wireframe/*", "**/data/wireframe", "**/data/wireframe/*"],
              message:
                "Import data through loadCatalog() (src/lib/catalog). Only the isolated fixture adapter may read @/data/wireframe.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/catalog/fixture.ts", "src/data/wireframe/**", "tests/**"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { process: "readonly" } },
    rules: { "no-restricted-imports": "off" },
  },
];

export default config;
