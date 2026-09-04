import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const routes = ['/zh-CN/prompts', '/zh-CN/prompts/image', '/zh-CN/prompts/video', '/zh-CN/prompts/models/nano-banana-pro', '/zh-CN/prompts/country-miniature-stamp-poster'];
for (const route of routes) {
  test(`accessible and responsive: ${route}`, async ({ page }, testInfo) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toHaveCount(1);
    const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations;
    await testInfo.attach('axe.json', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
    expect(violations.filter(violation => violation.impact === 'critical' || violation.impact === 'serious').map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
}
test('320px long-content layout and keyboard entry', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  }
});
test('404 and disabled translation are real failures', async ({ page }) => {
  expect((await page.goto('/zh-CN/prompts/does-not-exist'))?.status()).toBe(404);
  expect((await page.goto('/en/prompts'))?.status()).toBe(404);
});
test('the five pages have primary content without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const route of routes) {
    const response = await page.goto(`${process.env.FRONTEND_TEST_URL ?? 'http://127.0.0.1:3000'}${route}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.locator('main a[href]').count()).toBeGreaterThan(0);
    expect(await page.locator('main').innerText()).not.toContain('Opening the library');
  }
  await context.close();
});

test('tablet widths and dark theme preserve readable content', async ({ page }) => {
  for (const width of [768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.filter(item => item.impact === 'critical' || item.impact === 'serious').map(item => item.id)).toEqual([]);
  }
});
