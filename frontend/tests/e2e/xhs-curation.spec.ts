import {expect, test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['zh-CN', 'en']) {
  test(`${locale} creator cases link from the library to the original posts`, async ({page}) => {
    const href = `/${locale}/prompts/creator-studies/zhenzhu-naicha`;
    await page.goto(`/${locale}/prompts`);
    await page.locator(`a[href="${href}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator('.xhs-study')).toHaveCount(8);
    await expect(page.locator('.xhs-study-cover img')).toHaveCount(8);
    await expect(page.locator('.xhs-study a[href*="xiaohongshu.com/explore/"]')).toHaveCount(16);

    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({width, height: 900});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    const axe = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(axe.violations.filter(v => ['critical', 'serious'].includes(v.impact ?? ''))).toEqual([]);

    await page.locator('.language-switch summary').click();
    const other = locale === 'zh-CN' ? 'en' : 'zh-CN';
    await page.locator(`.language-switch a[hreflang="${other}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${other}/prompts/creator-studies/zhenzhu-naicha$`));
    await expect(page.locator('.xhs-study')).toHaveCount(8);
  });
}
