import { expect, test } from "@playwright/test";

test("bracket templates appear across hub, both decks, task and style", async ({ page }) => {
  for (const [path, selector] of [
    ["/zh-CN/prompts", ".exp .txt"],
    ["/zh-CN/prompts/image", ".dc[data-top] .prompt"],
    ["/zh-CN/prompts/video", ".dc[data-top] .prompt"],
    ["/zh-CN/prompts/use-cases/beauty", ".verbatim"],
    ["/zh-CN/prompts/styles/photorealistic", ".wall"],
  ] as const) {
    await page.goto(path);
    expect(await page.locator(`${selector} .prompt-placeholder`).count(), path).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
  }
});

test("poster template loads into hero and can be filled and reset on L4", async ({ page }) => {
  await page.goto("/zh-CN/prompts/model-families/nano-banana");
  await expect(page.locator(".model-signature .msh-wall")).not.toHaveAttribute("data-paused", "");
  const entry = page.locator("#e-2026574551207792783");
  const template = await entry.locator(".mono").textContent();
  expect(template).toContain("[POSTER_TEXT]");
  await entry.getByRole("link", { name: "Generate image", exact: true }).click();
  await expect(page.locator(".msh-input")).toHaveValue(template ?? "");
  await expect(page.locator(".msh-input")).toBeFocused();
  await entry.locator("h4 a").click();
  await page.getByRole("radiogroup", { name: "[POSTER_TEXT]", exact: true }).getByRole("radio", { name: "Custom", exact: true }).check();
  const input = page.getByRole("textbox", { name: "[POSTER_TEXT]", exact: true });
  await expect(input).toHaveAttribute("placeholder", "HEIS");
  await input.fill("NOVA");
  await expect(page.locator("[data-prompt]")).toContainText('the word "NOVA"');
  await expect(page.locator("[data-prompt]")).toContainText("subtle film grain texture");
  await expect(page.getByText("Show the original prompt", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Reset placeholders" }).click();
  await expect(input).toHaveCount(0);
  await expect(page.locator("[data-prompt]")).toHaveText(template ?? "");
  await page.locator("[data-prompt]").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `evidence/prompt-templates/poster-${test.info().project.name}.png` });
});
