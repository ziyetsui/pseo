import { expect, test } from '@playwright/test';

test('model family has selected hero, real version links and one persistent composer', async ({ page }) => {
  await page.goto('/zh-CN/prompts/model-families/nano-banana');
  const hero = page.locator('.model-signature');
  await expect(hero.locator('h1')).toHaveText('Nano Banana');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Your prompt', exact: true })).toHaveCount(1);
  await expect(page.locator('.proto-picker')).toHaveCount(0);
  await expect(hero.locator('.msh-note')).toHaveText(['17 prompts to build on', 'Pick one. Make it yours.']);
  await expect(hero.getByRole('link', { name: 'Generate image', exact: true })).toHaveAttribute('href', 'https://bo.ancher.ai/home');
  await expect(hero.locator('.msh-generate')).toHaveAttribute('target', '_blank');
  const version = hero.getByRole('link', { name: 'Nano Banana Pro', exact: true });
  await expect(version).toHaveAttribute('href', '/zh-CN/prompts/models/nano-banana-pro');
  const pause = hero.locator('.msh-motion');
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  await expect(hero.locator('.msh-wall')).toHaveAttribute('data-paused', '');
  await version.click();
  await expect(page).toHaveURL(/\/models\/nano-banana-pro$/);
  await expect(page.locator('.model-signature h1')).toHaveText('Nano Banana Pro');
  const cta = page.locator('.entry .acts a').first();
  const href = await cta.getAttribute('href');
  expect(href).toMatch(/^\/zh-CN\/prompts\/[^/]+$/);
  const original = await page.locator('.entry .body .mono').first().textContent();
  await cta.click();
  const input = hero.getByRole('textbox', { name: 'Your prompt', exact: true });
  await expect(page).toHaveURL(/\/models\/nano-banana-pro$/);
  await expect(input).toHaveValue(original ?? '');
  await expect(input).toBeFocused();
  await expect.poll(async () => input.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= innerHeight;
  })).toBe(true);
  await page.reload();
  await expect(input).toHaveValue(original ?? '');
  // Full detail remains available from the entry title.
  await page.locator('.entry h4 a').first().click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test('hero fits small screens and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh-CN/prompts/model-families/nano-banana');
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  expect(await page.locator('.msh-lane').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

test('model hero and prompt index remain readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/zh-CN/prompts/model-families/nano-banana');
  await expect(page.locator('h1')).toHaveText('Nano Banana');
  expect(await page.locator('.toc a').count()).toBeGreaterThan(0);
  expect(await page.locator('.entry').count()).toBeGreaterThan(0);
  const fallback = page.locator('.entry .acts a').first();
  const href = await fallback.getAttribute('href');
  await fallback.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await context.close();
});
