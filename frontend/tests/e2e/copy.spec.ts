import { expect, test } from "@playwright/test";

import { ROUTES } from "./routes";

const SUCCESS = "已复制到剪贴板";
const FAILURE = "复制失败，可选中文本手动复制";
const TOKEN = "[COUNTRY]";
const CHOICE = "France";

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * The copy contract (global constraint 9): "已复制" is shown only after the
 * clipboard write actually resolved, and the copied text has every occurrence
 * of the chosen variable substituted — counted from the published prompt, not
 * hardcoded.
 */
test.describe("prompt copy on the golden detail page", () => {
  test("copies the substituted prompt and only then claims success", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(ROUTES.l4);

    const source = await page.locator("#prompt-text").innerText();
    const tokenCount = occurrences(source, TOKEN);
    const baselineChoices = occurrences(source, CHOICE);
    expect(tokenCount, "the golden prompt must carry [COUNTRY] tokens").toBeGreaterThan(0);

    const group = page.getByRole("radiogroup").first();
    const choice = group.getByRole("radio", { name: CHOICE, exact: true });
    await choice.click();
    await expect(choice).toHaveAttribute("aria-checked", "true");

    const button = page.getByRole("button", { name: "复制提示词" }).first();
    await button.click();

    await expect(page.getByText(SUCCESS).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /已复制/ }).first()).toBeVisible();

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).not.toContain(TOKEN);
    expect(occurrences(copied, CHOICE)).toBe(baselineChoices + tokenCount);
    // Nothing but the token changed.
    expect(copied).toBe(source.split(TOKEN).join(CHOICE));
  });

  test("a rejected clipboard write never shows a success state", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: () => Promise.reject(new Error("clipboard denied by test")),
          readText: () => Promise.resolve(""),
        },
      });
    });
    await page.goto(ROUTES.l4);

    await page.getByRole("button", { name: "复制提示词" }).first().click();

    await expect(page.getByText(FAILURE).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("已复制");

    // The failure path must hand the reader something to copy by hand.
    const selected = await page.evaluate(() => window.getSelection()?.toString() ?? "");
    expect(selected.length).toBeGreaterThan(0);
    expect(selected).not.toContain(TOKEN);
  });
});
