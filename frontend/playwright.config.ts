import { defineConfig, devices } from "@playwright/test";

/**
 * Which of the two visual themes this run is pointed at.
 *
 * The site ships `neutral` and keeps `bauhaus` behind `NEXT_PUBLIC_THEME` for
 * side-by-side comparison, so a run has to agree with the export it is serving.
 * `pnpm build:bauhaus` writes that export to `out-bauhaus/`, deliberately NOT
 * to `out/`: the default build stays where it is, and no run can silently
 * screenshot one theme while claiming the other.
 */
const BAUHAUS = process.env.NEXT_PUBLIC_THEME === "bauhaus";

// A dedicated, unusual port: 3100 collides with other tooling on this machine,
// and `reuseExistingServer` then silently attaches Playwright to whatever is
// already listening — which once produced a full green run (and screenshots)
// against a different site entirely. Never reuse: the run must serve the
// export this repository just built. The two themes take different ports so a
// stale server from the other one cannot be mistaken for this one's.
const PORT = BAUHAUS ? 43118 : 43117;
const SERVE_DIR = BAUHAUS ? "out-bauhaus" : "out";
const BASE_URL = `http://127.0.0.1:${PORT}`;

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
    // Serves the `next build` static export; run `pnpm build` (or, for the
    // comparison theme, `pnpm build:bauhaus`) first.
    // Bind loopback explicitly: an internal-beta test server must never be
    // exposed on every interface of the developer machine.
    command: `pnpm exec serve ${SERVE_DIR} -l tcp://127.0.0.1:${PORT} --no-port-switching -n`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
