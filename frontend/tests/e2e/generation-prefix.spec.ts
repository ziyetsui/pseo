import { test, expect } from '@playwright/test';

for (const locale of ['en', 'zh-CN']) {
  test(`${locale} image handoff keeps the instruction after fill, reset and intent dialog`, async ({ page }) => {
    await page.goto(`/${locale}/prompts/queenie-the-day-i-gave-up-my-corporate-promotion-xhud3l`);
    const body = page.locator('[data-prompt]');
    const link = page.locator('[data-generation-cta]');
    const payload = async () => new URL((await link.getAttribute('href'))!).searchParams.get('prompts');
    const template = await body.textContent();
    await expect.poll(payload).toBe(`创建一张关于的图片\n\n${template}`);
    await page.locator('input[name=placeholder-0]').first().check();
    await expect.poll(payload).toBe(`创建一张关于的图片\n\n${await body.textContent()}`);
    await page.getByRole('button', { name: locale === 'en' ? 'Reset placeholders' : '重置占位符', exact: true }).click();
    await expect.poll(payload).toBe(`创建一张关于的图片\n\n${template}`);
    await link.click();
    await expect(page.locator('dialog[open] .sign-in-gate-btn')).toHaveAttribute('href', (await link.getAttribute('href'))!);
  });
}
