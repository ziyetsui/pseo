import { expect, test } from "@playwright/test";

import { ROUTES, currentPath } from "./routes";

/**
 * L1 → L2 → L3 → L4 walked the way a reader walks it: by clicking real links
 * inside `<main>`, never by navigating to a URL the test made up. A link that
 * only exists in the header would pass a `page.goto` test while the body of
 * the page was a dead end, so every hop below is scoped to `main`.
 */
test.describe("four-level journey", () => {
  test("clicks from the hub down to a prompt detail page", async ({ page }) => {
    // ------------------------------------------------------------------ L1
    await page.goto(ROUTES.l1);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(currentPath(page)).toBe(ROUTES.l1);

    // ------------------------------------------------------------ L1 → L2
    await page.locator("main").getByRole("link", { name: "浏览图片提示词" }).click();
    await page.waitForURL(`**${ROUTES.l2}`);
    expect(currentPath(page)).toBe(ROUTES.l2);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText("图片提示词");

    // ------------------------------------------------------------ L2 → L3
    await page.locator(`main a[href="${ROUTES.l3}"]`).first().click();
    await page.waitForURL(`**${ROUTES.l3}`);
    expect(currentPath(page)).toBe(ROUTES.l3);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText("Nano Banana Pro");

    // The prototype's three no-op controls must read as unavailable, not as
    // working buttons (global constraint 12).
    // `Section` puts the id on its <h2> and labels the band with it.
    const generate = page.locator('section[aria-labelledby="model-generate"]');
    await expect(generate.locator('button[aria-disabled="true"]')).toHaveCount(3);
    await expect(generate).toContainText("生成功能尚未接入");

    // ------------------------------------------------------------ L3 → L4
    const detailHref = await page
      .locator('main a[href^="/zh-CN/prompts/"]')
      .evaluateAll((elements) => {
        const match = elements.find((element) => {
          const href = element.getAttribute("href") ?? "";
          return /^\/zh-CN\/prompts\/[^/?#]+$/.test(href) && href !== "/zh-CN/prompts/image";
        });
        return match?.getAttribute("href") ?? null;
      });
    expect(detailHref, "L3 must link to at least one prompt detail page").not.toBeNull();

    await page.locator(`main a[href="${detailHref}"]`).first().click();
    await page.waitForURL(`**${detailHref}`);
    expect(currentPath(page)).toBe(detailHref);
    await expect(page.locator("h1")).toHaveCount(1);
    // A detail page always publishes the prompt itself.
    await expect(page.locator("#prompt-text")).toBeVisible();
  });

  test("every level page has exactly one h1 and a skip link into main", async ({ page }) => {
    for (const path of [ROUTES.l1, ROUTES.l2, ROUTES.l3, ROUTES.l4, ROUTES.blog]) {
      await page.goto(path);
      await expect(page.locator("h1"), `one h1 on ${path}`).toHaveCount(1);
      await expect(page.locator('a[href="#main"]'), `skip link on ${path}`).toHaveCount(1);
      await expect(page.locator("#main"), `#main target on ${path}`).toHaveCount(1);
    }
  });
});
