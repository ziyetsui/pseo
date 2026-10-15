import { expect, test } from '@playwright/test';

const slug = 'case-7d46d699adedf29269d0660aa4086291';
test('website template values update the full prompt and generation link, then reset', async ({ page }, info) => {
  for (const locale of ['en', 'zh-CN']) {
    const chinese = locale === 'zh-CN';
    await page.goto(`/${locale}/prompts/${slug}`, { waitUntil: 'domcontentloaded' });
    const body = page.locator('[data-prompt]');
    const template = await body.textContent();
    expect(template).toContain('[PROJECT_NAME]');
    expect(template).toContain('[PANEL_COLOR]');
    await expect(page.getByText('Word for word, as published.', { exact: true })).toHaveCount(0);
    for (const [token, value] of [['[PROJECT_NAME]', 'AURORA 王国'], ['[PANEL_COLOR]', '#ABCDEF']] as const) {
      await page.getByRole('radiogroup', { name: token, exact: true }).getByRole('radio', { name: chinese ? '自定义' : 'Custom', exact: true }).check();
      await page.getByRole('textbox', { name: token, exact: true }).fill(value);
      await expect(body).toContainText(value);
    }
    await expect.poll(async () => new URL((await page.locator('[data-generation-cta]').getAttribute('href'))!).searchParams.get('prompts')).toBe(await body.textContent());
    expect(await body.textContent()).not.toContain('[PROJECT_NAME]');
    await page.getByRole('button', { name: chinese ? '重置占位符' : 'Reset placeholders', exact: true }).click();
    await expect(body).toHaveText(template!);
    await expect.poll(async () => new URL((await page.locator('[data-generation-cta]').getAttribute('href'))!).searchParams.get('prompts')).toBe(template);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole('heading', { name: chinese ? '设置占位符' : 'Set the placeholders', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${locale}-website-placeholders.png`), animations: 'disabled' });
  }
});

test('website template remains readable with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${process.env.FRONTEND_TEST_URL ?? 'http://127.0.0.1:3000'}/en/prompts/${slug}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-prompt]')).toContainText('[PROJECT_NAME]');
  await expect(page.locator('[data-prompt]')).toContainText('vanilla JS + Three.js');
  await expect(page.locator('[data-generation-cta]')).toHaveAttribute('href', /prompts=/);
  await context.close();
});
