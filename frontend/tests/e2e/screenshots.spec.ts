import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { LEVELS, ROUTES } from "./routes";

/**
 * Delivery evidence, not an assertion suite: full-page PNGs of L1–L4 (plus the
 * blog list) at 1440×1200 and 375×812, written into `evidence/screenshots/`
 * and committed. Excluded from `pnpm test:e2e` by the project config, so a
 * normal test run never rewrites them.
 *
 * Two themes, two directories. The default theme owns the top level, because
 * that is what the site looks like; `bauhaus` — the previous system, kept for
 * comparison during the transition — writes into a subdirectory of its own. The
 * theme is read from the same env var the build reads, so a run cannot write a
 * set of PNGs under the wrong name: `pnpm screenshots:bauhaus` sets it for both
 * the export and this spec, and `playwright.config.ts` serves the matching
 * `out-bauhaus/`.
 */
const OUTPUT_DIR = path.resolve(
  import.meta.dirname,
  process.env.NEXT_PUBLIC_THEME === "bauhaus"
    ? "../../evidence/screenshots/bauhaus"
    : "../../evidence/screenshots",
);

const SHOTS = [
  ...LEVELS.map((level) => ({ key: level.key, path: level.path, desktopOnly: false })),
  { key: "blog", path: ROUTES.blog, desktopOnly: true },
] as const;

for (const shot of SHOTS) {
  test(`screenshot ${shot.key}`, async ({ page }, testInfo) => {
    const desktop = testInfo.project.name === "screenshots-desktop";
    test.skip(shot.desktopOnly && !desktop, "bonus shot, desktop only");
    test.setTimeout(90_000);

    await mkdir(OUTPUT_DIR, { recursive: true });
    await page.goto(shot.path);
    await expect(page.locator("h1")).toHaveCount(1);

    // Media below the fold is `loading="lazy"`, so walk the page once to give
    // every frame a chance to resolve (or to fall back) before capturing. The
    // prompt images live on an external host that may be unreachable here —
    // the fallback state is then what the shot honestly records.
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);

    const file = path.join(OUTPUT_DIR, `${shot.key}-${desktop ? "desktop" : "mobile"}.png`);
    // `scale: "css"` pins the PNG to CSS pixels (1440 / 375 wide). Without it
    // the Pixel 7 profile's 2.625 device pixel ratio would produce ~7× larger
    // files for the same picture, which is not something to commit.
    await page.screenshot({ path: file, fullPage: true, animations: "disabled", scale: "css" });
  });
}
