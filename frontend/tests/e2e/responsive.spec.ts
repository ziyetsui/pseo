import { expect, test } from "@playwright/test";

import { LEVELS } from "./routes";

/** Global constraint 8: no page-level horizontal overflow at any of these. */
const WIDTHS = [320, 375, 768, 1024, 1440] as const;

/** One CSS pixel of slack absorbs sub-pixel rounding in the layout engine. */
const TOLERANCE = 1;

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "widths are driven explicitly; the device project would only re-test them",
  );
});

for (const level of LEVELS) {
  test(`${level.label} never scrolls horizontally`, async ({ page }) => {
    await page.goto(level.path);

    // Every width is measured before anything is asserted, so a failure names
    // all the breakpoints that overflow rather than only the first one.
    const measurements: { width: number; scrollWidth: number; clientWidth: number }[] = [];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForFunction((expected) => window.innerWidth === expected, width);

      const measured = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      measurements.push({ width, ...measured });
    }

    const overflowing = measurements
      .filter((entry) => entry.scrollWidth > entry.clientWidth + TOLERANCE)
      .map(
        (entry) =>
          `${entry.width}px: scrollWidth ${entry.scrollWidth} > clientWidth ${entry.clientWidth}`,
      );

    expect(overflowing, `${level.path} horizontal overflow`).toEqual([]);
  });
}
