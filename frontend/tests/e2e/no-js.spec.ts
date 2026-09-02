import { expect, test } from "@playwright/test";

import { ROUTES } from "./routes";

/**
 * Global constraint 11: with JavaScript off, the reader still gets the H1, the
 * prompt body and the real links, because the first screenful of every page is
 * rendered by RSC into the exported HTML.
 *
 * This is the regression guard for Finding 1 (`evidence/test-run.md`): the
 * export used to leave a route-level `loading.tsx` skeleton inside `<main>` and
 * stream the real page into a trailing `<div hidden id="S:0">` that only an
 * inline script revealed, so a reader without JavaScript saw nothing but 加载中.
 * The fix was to delete every route-level `loading.tsx` (see the note in
 * `src/app/[locale]/layout.tsx`). The assertions below therefore check
 * VISIBILITY and placement inside `<main>`, not mere presence in the DOM — a
 * node parked in `<div hidden>` is not published content.
 */
test.use({ javaScriptEnabled: false });

test.describe("without JavaScript", () => {
  test("L1 still lists prompts and offers a working GET search form", async ({ page }) => {
    await page.goto(ROUTES.l1);

    const heading = page.locator("main h1");
    await expect(heading, "the H1 must be inside <main>, not in a hidden buffer").toBeVisible();
    // The prototype's two-line L1 H1: `N 条 Higgsfield 提示词` / `复制即用`.
    await expect(heading).toContainText(/\d+ 条 .*提示词/);

    const hrefs = await page
      .locator('main a[href^="/zh-CN/prompts/"]')
      .evaluateAll((elements) =>
        elements
          .map((element) => element.getAttribute("href") ?? "")
          .filter(
            (href) =>
              /^\/zh-CN\/prompts\/[^/?#]+$/.test(href) && href !== "/zh-CN/prompts/image",
          ),
      );
    expect(hrefs.length, "L1 must ship prompt detail links inside <main>").toBeGreaterThan(0);

    // The search box is a plain GET form, so it works without a click handler.
    const form = page.getByRole("search");
    await expect(form).toHaveAttribute("action", ROUTES.l1);
    await expect(form).toHaveAttribute("method", "get");
    await expect(form.locator('input[name="q"]')).toHaveCount(1);

    // Facet chips are links, not buttons — they must carry real hrefs.
    const chipHrefs = await page
      .locator('[role="group"][aria-labelledby="explorer-facet-model"] a')
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("href") ?? ""));
    expect(chipHrefs.length).toBeGreaterThan(0);
    for (const href of chipHrefs) expect(href).toMatch(/^\/zh-CN\/prompts\?/);
  });

  test("the golden L4 page still publishes the prompt verbatim", async ({ page }) => {
    await page.goto(ROUTES.l4);

    await expect(page.locator("main h1")).toBeVisible();
    const source = page.locator("#prompt-text");
    await expect(source, "the prompt body must be visible without JavaScript").toBeVisible();
    await expect(source).toContainText("[COUNTRY]");

    // The source attribution link is a real outbound href, not a JS handler.
    expect(await page.locator('main a[href^="https://x.com/"]').count()).toBeGreaterThan(0);
  });
});
