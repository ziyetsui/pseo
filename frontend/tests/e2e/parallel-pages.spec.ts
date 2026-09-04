import { expect, test } from '@playwright/test';

test('every L4 uses the same working choice, reset and generation flow', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/zh-CN/prompts');
  const hrefs = await page.locator('.exp .acts a').evaluateAll(links => [...new Set(links.map(link => link.getAttribute('href')!))]);
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    await test.step(href, async () => {
      expect((await page.goto(href))?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('section.step')).toHaveCount(4);
      const payload = page.locator('[data-prompt]');
      const template = await payload.textContent();
      const groups = page.getByRole('radiogroup');
      expect(await groups.count()).toBeGreaterThan(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('a[data-generation-cta]')).toHaveAttribute('href', 'https://bo.video/home');
      for (const group of await groups.all()) {
        expect(await group.getByRole('radio').count()).toBeGreaterThanOrEqual(3);
        await expect(group.getByRole('radio', { name: 'Custom', exact: true })).toHaveCount(1);
        await group.getByRole('radio').first().check();
        await expect(group.getByRole('radio').first()).toBeChecked();
      }
      await expect(page.getByRole('status')).toContainText('All placeholders are filled.');
      await expect(payload).not.toHaveText(template ?? '');
      await page.getByRole('button', { name: 'Reset placeholders', exact: true }).click();
      await expect(payload).toHaveText(template ?? '');
      await expect(page.locator('.recipe-placeholder-form input:checked')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), href).toBe(true);
    });
  }
});

test('empty styles and single-prompt tasks use the correct shared states', async ({ page }) => {
  for (const slug of ['anime-illustrated', 'surreal-fantasy']) {
    await page.goto(`/zh-CN/prompts/styles/${slug}`);
    const empty = page.locator('.style-results .empty');
    await expect(empty).toBeVisible();
    await expect(empty.getByRole('button', { name: 'Clear filters', exact: true })).toHaveCount(0);
    await expect(empty.locator('a')).toHaveAttribute('href', '/zh-CN/prompts');
    await empty.locator('a').click();
    await expect(page).toHaveURL(/\/zh-CN\/prompts$/);
  }
  for (const slug of ['automotive', 'web-motion-design']) {
    await page.goto(`/zh-CN/prompts/use-cases/${slug}`);
    await expect(page.locator('.ctrl [role="status"]')).toContainText('1 of 1');
    await expect(page.locator('main')).not.toContainText('the 1 prompts');
    await expect(page.locator('main #tasks .tiles, main #models .tiles')).toHaveCount(0);
  }
});
