import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Website category opens the existing Findings design with real source and detail links', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/zh-CN/prompts');
  const tile = page.locator('#category a.tile').filter({ hasText: 'Website' });
  await expect(tile).toHaveCount(1);
  await expect(tile.locator('p')).toHaveText('1 prompt');
  await tile.click();
  await expect(page).toHaveURL(/\/zh-CN\/prompts\/website$/);
  await expect(page.locator('h1')).toHaveText('Website prompts are specifications.');
  await expect(page.locator('.ctrl a[aria-current="page"]')).toHaveAttribute('href', '/zh-CN/prompts/website');
  await expect(page.locator('.ctrl [role="status"]')).toHaveText('1 of 1 Website prompt');
  await expect(page.locator('.spec .sno a').first()).toHaveAttribute('href', /https:\/\/x.com\/zeuuss_01\/status\//);
  await expect(page.locator('.spec h3 a').first()).toHaveAttribute('href', /\/zh-CN\/prompts\//);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations.map(v => v.id)).toEqual([]);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJS = await context.newPage();
  const response = await noJS.goto(`${process.env.FRONTEND_TEST_URL}/zh-CN/prompts/website`);
  expect(response?.status()).toBe(200);
  await expect(noJS.locator('h1')).toContainText('Website prompts');
  await context.close();
  expect(errors).toEqual([]);
});

test('category tiles and Website page fit 375, 768 and 1440 pixel viewports', async ({ page }, testInfo) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/zh-CN/prompts#category');
    await page.locator('#category').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`categories-${width}.png`) });
    await page.goto('/zh-CN/prompts/website');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`website-${width}.png`) });
  }
});
