import { expect, test } from '@playwright/test';

test('model and family pages offer real thumbnail topics in place of About panels', async ({ page }) => {
  for (const path of ['/zh-CN/prompts/model-families/nano-banana', '/zh-CN/prompts/models/seedance', '/zh-CN/prompts/model-families/gpt-image']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: /^About this model/ })).toHaveCount(0);
    const section = page.locator('#related-topics');
    await expect(section.getByRole('heading', { name: 'Related topics', exact: true })).toBeVisible();
    const cards = section.locator('a');
    expect(await cards.count()).toBeGreaterThan(0);
    expect(await cards.count()).toBeLessThanOrEqual(6);
    await expect(section.locator('video')).toHaveCount(0);
    await section.scrollIntoViewIfNeeded();
    const firstTop = await cards.first().evaluate(el => el.getBoundingClientRect().top);
    for (const card of await cards.all()) {
      expect(await card.evaluate(el => el.getBoundingClientRect().top)).toBeCloseTo(firstTop, 0);
      const href = await card.getAttribute('href');
      expect(href).toMatch(/^\/zh-CN\/prompts(?:\/|\?)/);
      expect((await page.request.get(href!)).status()).toBe(200);
      await expect(card.locator('img')).toHaveCount(1);
    }
    await cards.last().scrollIntoViewIfNeeded();
    await expect(cards.last()).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await cards.first().scrollIntoViewIfNeeded();
    if (path.endsWith('nano-banana')) await section.screenshot({ path: `evidence/model-related-topics/${test.info().project.name}.png` });
    const destination = await cards.first().getAttribute('href');
    await cards.first().click();
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(destination);
    await expect(page.locator('h1')).toHaveCount(1);
  }
});
