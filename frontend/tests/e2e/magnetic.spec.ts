import { test, expect } from '@playwright/test';

test('Magnetic peek preserves layout, keyboard access and reduced motion', async ({ page }) => {
  await page.goto('/zh-CN/prompts');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const field = page.locator('.run'), first = field.locator('[data-expand]').first();
  await first.scrollIntoViewIfNeeded();
  const before = await field.boundingBox();
  await first.focus(); await page.keyboard.press('Enter');
  const panel = page.locator('[data-peek] .exp');
  await expect(panel).toBeVisible();
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  expect(await field.boundingBox()).toEqual(before);
  const bounds = await panel.boundingBox(), viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(11);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width - 11);
  await page.keyboard.press('Tab');
  await expect(panel.locator('a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(first).toBeFocused();
  await expect(first).toHaveAttribute('data-inked', '');
  await expect(first).toHaveCSS('transform', 'none');
  await expect(page.getByRole('button', { name: /copy/i })).toHaveCount(0);
});

test('Magnetic pointer attraction releases and peek freezes on hover', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Fine-pointer interaction; touch has anchored peek coverage.');
  await page.goto('/zh-CN/prompts');
  const first = page.locator('.run [data-expand]').first();
  await first.scrollIntoViewIfNeeded();
  const rect = await first.boundingBox();
  await page.mouse.move(rect!.x + rect!.width / 2 + 20, rect!.y + 20);
  await expect.poll(() => first.evaluate(el => Math.abs(parseFloat((el as HTMLElement).style.getPropertyValue('--fx'))))).toBeGreaterThan(.5);
  await page.mouse.move(0, 0);
  await expect.poll(() => first.evaluate(el => Math.abs(parseFloat((el as HTMLElement).style.getPropertyValue('--fx'))))).toBeLessThan(.1);
  await first.click();
  const panel = page.locator('[data-peek] .exp');
  await expect(panel).toBeVisible();
  await page.waitForTimeout(1000);
  const a = await panel.boundingBox();
  await page.mouse.move(a!.x + 10, a!.y + 10);
  await page.waitForTimeout(700);
  const b = await panel.boundingBox();
  expect(Math.abs(a!.x - b!.x)).toBeLessThan(2);
  await panel.getByRole('link', { name: /^Generate/ }).click();
  await expect(page.locator('.prototype-recipe')).toBeVisible();
});
