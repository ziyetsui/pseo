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

test('Depth field racks focus on hover and holds the peek still', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Fine-pointer interaction; touch has anchored peek coverage.');
  await page.goto('/zh-CN/prompts');
  const box = page.locator('.runbox');
  await box.scrollIntoViewIfNeeded();
  await expect(box).toHaveAttribute('data-depth', '');
  // Pick a title that is near and fully visible, so it is large enough to hover.
  const target = page.locator('.run [data-expand][data-tier="0"]').first();
  await expect(target).toBeVisible();
  const rect = await target.boundingBox();
  await page.mouse.move(rect!.x + rect!.width / 2, rect!.y + rect!.height / 2);
  await expect(page.locator('.run [data-expand][data-held]')).toHaveCount(1);
  const held = page.locator('.run [data-expand][data-held]');
  await expect(held).toHaveAttribute('data-tier', '0');
  // The field brakes to a stop while a title is held.
  await page.waitForTimeout(900);
  const a = await held.evaluate(el => (el as HTMLElement).style.transform);
  await page.waitForTimeout(400);
  expect(await held.evaluate(el => (el as HTMLElement).style.transform)).toBe(a);
  await held.click();
  const panel = page.locator('[data-peek] .exp');
  await expect(panel).toBeVisible();
  const p1 = await panel.boundingBox();
  await page.mouse.move(p1!.x + 10, p1!.y + 10);
  await page.waitForTimeout(700);
  const p2 = await panel.boundingBox();
  expect(Math.abs(p1!.x - p2!.x)).toBeLessThan(2);
  // Generate hands off to the creation app in a new tab; the field stays put behind it.
  const generate = panel.getByRole('link', { name: /^Generate|^生成/ });
  await expect(generate).toHaveAttribute('target', '_blank');
  await expect(generate).toHaveAttribute('href', /^https:\/\//);
});
