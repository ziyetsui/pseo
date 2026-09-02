import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/** Written by `tests/e2e/screenshots.spec.ts`, committed as delivery evidence. */
const SCREENSHOT_SPEC = /screenshots\.spec\.ts/;

const DESKTOP_VIEWPORT = { width: 1440, height: 1200 };
const MOBILE_VIEWPORT = { width: 375, height: 812 };

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    // The two assertion projects. Screenshot capture is excluded from them so
    // `pnpm test:e2e` never rewrites committed PNGs as a side effect.
    {
      name: "desktop",
      testIgnore: SCREENSHOT_SPEC,
      use: { ...devices["Desktop Chrome"], viewport: DESKTOP_VIEWPORT },
    },
    {
      name: "mobile",
      testIgnore: SCREENSHOT_SPEC,
      use: { ...devices["Pixel 7"], viewport: MOBILE_VIEWPORT },
    },
    // `pnpm screenshots` runs only these two, against the same served `out/`.
    {
      name: "screenshots-desktop",
      testMatch: SCREENSHOT_SPEC,
      use: { ...devices["Desktop Chrome"], viewport: DESKTOP_VIEWPORT },
    },
    {
      name: "screenshots-mobile",
      testMatch: SCREENSHOT_SPEC,
      use: { ...devices["Pixel 7"], viewport: MOBILE_VIEWPORT },
    },
  ],
  webServer: {
    // Serves the `next build` static export; run `pnpm build` first.
    command: `pnpm exec serve out -l ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
