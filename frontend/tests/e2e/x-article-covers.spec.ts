import { expect, test } from '@playwright/test';
for (const locale of ['zh-CN', 'en']) {
  for (const suffix of ['', '/creators/thedankoe', '/2010751592346030461']) {
    test(`original article covers ${locale}${suffix}`, async ({ page }, info) => {
      await page.goto(`/${locale}/prompts/articles${suffix}`);
      const first = page.locator('img[src="/x-article-covers/2010751592346030461.jpg"]').first();
      await expect(first).toBeVisible();
      await expect(first).toHaveJSProperty('complete', true);
      expect(await first.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const cover = first.locator('..');
      await cover.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/ancher-article-covers/${info.project.name}-${locale}-${suffix.includes('creators') ? 'author' : suffix ? 'detail' : 'gallery'}.png` });
      if (!suffix) {
        await expect(page.locator('.xa-card')).toHaveCount(105);
        const sources = await page.locator('.xa-cover img').evaluateAll(images => images.map(image => (image as HTMLImageElement).getAttribute('src')));
        for (const src of sources) {
          const response = await page.request.get(src!);
          expect(response.status()).toBe(200);
          expect(response.headers()['content-type']).toMatch(/^image\//);
        }
      }
    });
  }
}
