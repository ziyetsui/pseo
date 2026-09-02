import { expect, test } from "@playwright/test";

import { ROUTES } from "./routes";

test.describe("404", () => {
  test("an unknown prompt slug answers 404 with the real not-found page", async ({ page }) => {
    const response = await page.goto(ROUTES.missing);
    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("页面不存在");
  });

  test("the exported 404 page offers real recovery links", async ({ page }) => {
    await page.goto(ROUTES.notFound);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("页面不存在");

    const recovery = page.getByRole("navigation", { name: "可前往的页面" }).getByRole("link");
    await expect(recovery).toHaveCount(3);

    const hrefs = await recovery.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href") ?? ""),
    );
    expect(hrefs).toEqual([ROUTES.l1, ROUTES.l2, ROUTES.blog]);

    // Each one actually resolves — a 404 that links into another 404 is worse
    // than useless.
    for (const href of hrefs) {
      const response = await page.request.get(href);
      expect(response.status(), href).toBe(200);
    }
  });
});
