import { expect, test } from "@playwright/test";

import { ROUTES } from "./routes";

/** The disclosure only exists below `xl`; running it at 1440 would test nothing. */
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "the menu button is hidden from xl up");
});

test.describe("mobile navigation disclosure", () => {
  test("toggles aria-expanded and reveals real links", async ({ page }) => {
    await page.goto(ROUTES.l1);

    // The label flips to 关闭 when open, so the disclosure is addressed by its
    // `aria-controls` relationship instead of by its accessible name.
    const button = page.locator("header button[aria-controls]");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toHaveText("菜单");

    const panelId = await button.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = page.locator(`[id="${panelId ?? ""}"]`);
    await expect(panel).toBeHidden();

    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();
    // Only the three published destinations are links (首页 / 图片 / Blog); the
    // five the prototype names but this phase does not build are plain text
    // with （即将推出）, never a link (global constraint 5).
    await expect(panel.getByRole("link")).toHaveCount(3);
    await expect(panel.getByRole("link", { name: "图片" })).toBeVisible();

    await expect(button).toHaveText("关闭");
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
  });

  test("opens with Enter and closes with Escape, keeping focus on the button", async ({ page }) => {
    await page.goto(ROUTES.l1);

    const button = page.locator("header button[aria-controls]");
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeFocused();

    // Space is the other native activation key for a button.
    await page.keyboard.press(" ");
    await expect(button).toHaveAttribute("aria-expanded", "true");
  });

  test("navigates when a panel link is chosen", async ({ page }) => {
    await page.goto(ROUTES.l1);
    await page.locator("header button[aria-controls]").click();
    await page
      .getByRole("navigation", { name: "移动端主导航" })
      .getByRole("link", { name: "图片" })
      .click();
    await page.waitForURL(`**${ROUTES.l2}`);
    await expect(page.locator("h1")).toHaveText("图片提示词");
  });
});
