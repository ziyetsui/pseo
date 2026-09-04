import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const family = "/zh-CN/prompts/model-families/nano-banana";
const detail = "/zh-CN/prompts/country-miniature-stamp-poster";

test("fresh visits stay quiet; deliberate reading offers a nonmodal reminder on every level", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  for (const path of ["/zh-CN/prompts", "/zh-CN/prompts/image", "/zh-CN/prompts/video", family, "/zh-CN/prompts/use-cases/beauty", "/zh-CN/prompts/styles/photorealistic", detail]) {
    await page.goto(path);
    await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.clock.fastForward(35_000);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".weight-nudge")).toHaveCount(0);
    if (path.endsWith("/image") || path.endsWith("/video")) {
      const count = await page.locator(".dc").count();
      for (let i = 1; i < Math.ceil(count * .45); i++) await page.getByRole("button", { name: "Next →", exact: true }).click();
    }
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await page.clock.runFor(2000);
    await expect(page.locator(".weight-nudge"), path).toBeVisible();
    if (path === "/zh-CN/prompts") await page.screenshot({ path: `evidence/weight-cta/nudge-${test.info().project.name}.png` });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe("hidden");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole("button", { name: "Dismiss prompt reminder" }).click();
    await page.reload();
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await page.clock.fastForward(40_000);
    await expect(page.locator(".weight-nudge")).toHaveCount(0);
  }
});

test("external Generate opens Weight with the shared bo.video destination and preserves the draft", async ({ page, context }, info) => {
  await context.route("https://bo.ancher.ai/home", route => route.fulfill({ body: "Local navigation check" }));
  await context.route("https://bo.video/home", route => route.fulfill({ body: "Local navigation check" }));
  await page.goto(family);
  await expect(page.locator(".msh-wall")).not.toHaveAttribute("data-paused", "");
  const input = page.locator(".msh-input");
  await input.fill("A blue bird at sunrise");
  await expect(page.locator(".msh-count")).toContainText(`${"A blue bird at sunrise".length} characters`);
  const generate = page.locator(".msh-generate");
  await generate.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".sign-in-gate-figure")).toHaveText(String("A blue bird at sunrise".length));
  await expect(dialog.getByRole("link", { name: "Continue to bo ↗" })).toHaveAttribute("href", "https://bo.video/home");
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations).toEqual([]);
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    expect(await page.locator("dialog").evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.screenshot({ path: `evidence/weight-cta/weight-${info.project.name}.png` });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(generate).toBeFocused();
  await expect(input).toHaveValue("A blue bird at sunrise");
  const popup = context.waitForEvent("page");
  await generate.click();
  const opened = await popup;
  await opened.waitForLoadState();
  expect(opened.url()).toBe("https://bo.ancher.ai/home");
  await opened.close();
  await expect(dialog).toHaveCount(0);
  await page.evaluate(() => {
    sessionStorage.removeItem('prompt-library:sign-in-gate:intent-shown');
    localStorage.removeItem('prompt-library:sign-in-gate:quiet-until');
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await generate.click();
  const continuation = context.waitForEvent("page");
  await dialog.getByRole("link", { name: "Continue to bo ↗" }).click();
  const destination = await continuation;
  await destination.waitForLoadState();
  expect(destination.url()).toBe("https://bo.video/home");
  await destination.close();
  await expect(input).toHaveValue("A blue bird at sunrise");
});

test("Recipe Generate uses its current filled text; continuation silences later reminders", async ({ page, context }) => {
  await context.route("https://bo.video/home", route => route.fulfill({ body: "Local navigation check" }));
  await page.goto(detail);
  const radio = page.getByRole("radio").first();
  if (await radio.count()) await radio.check();
  const text = await page.locator("[data-prompt]").textContent() ?? "";
  await page.locator("a[data-generation-cta]").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".sign-in-gate-figure")).toHaveText(text.length.toLocaleString("en-US"));
  const popup = context.waitForEvent("page");
  await page.getByRole("link", { name: "Continue to bo ↗" }).click();
  const opened = await popup;
  await opened.waitForLoadState();
  expect(opened.url()).toBe("https://bo.video/home");
  await opened.close();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => Number(localStorage.getItem("prompt-library:sign-in-gate:quiet-until")) - Date.now())).toBeGreaterThan(89 * 86400_000);
});
