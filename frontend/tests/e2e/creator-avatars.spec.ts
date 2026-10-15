import { test, expect } from '@playwright/test';
import avatarInput from '../../src/data/creator-avatars.json' with { type: 'json' };

const avatars = new Map(Object.entries(avatarInput.profiles).map(([handle, profile]) => [handle, profile.src]));
const unavailable = new Set(Object.keys(avatarInput.unavailable));

test('creator cards display source-matched local avatars in both languages', async ({ page }) => {
  for (const locale of ['en', 'zh-CN']) {
    await page.goto(`/${locale}/prompts`, { waitUntil: 'domcontentloaded' });
    const section = page.locator('#creators');
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator('.creator-preview img')).toHaveCount(8);
    await section.locator('details summary').click();
    const cards = section.locator('a.person');
    await expect(cards).toHaveCount(347);
    for (const card of await cards.all()) {
      const handle = (await card.locator('b').innerText()).replace(/^@/u, '').toLowerCase();
      if (avatars.has(handle)) await expect(card.locator('img')).toHaveAttribute('src', avatars.get(handle)!);
      else {
        expect(unavailable.has(handle), `Unresolved avatar: ${handle}`).toBe(true);
        await expect(card.locator('.avatar-initial')).toBeVisible();
      }
    }
    const results = await section.locator('img').evaluateAll(async elements => {
      const images = elements.map(element => {
        if (!(element instanceof HTMLImageElement)) throw new Error('Expected a creator image');
        return element;
      });
      for (const image of images) image.loading = 'eager';
      await Promise.all(images.map(image => image.decode()));
      return images.map(image => ({ loaded: image.naturalWidth > 0, local: image.getAttribute('src')?.startsWith('/creator-avatars/') }));
    });
    expect(results.every(result => result.loaded && result.local)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});
