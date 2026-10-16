import { expect, test } from '@playwright/test';

const slug = 'website/prm_92f371524da72b3bcde64de274448347';
test('website template values update the full prompt and generation link, then reset', async ({ page }, info) => {
  for (const locale of ['en', 'zh-CN']) {
    const chinese = locale === 'zh-CN';
    await page.goto(`/${locale}/prompts/${slug}`, { waitUntil: 'domcontentloaded' });
    const body = page.locator('[data-prompt]');
    const template = await body.textContent();
    const tokens = await page.getByRole('radiogroup').evaluateAll(nodes => nodes.map(node => document.getElementById(node.getAttribute('aria-labelledby')!)!.textContent!));
    expect(tokens.length).toBeGreaterThan(0);
    await expect(page.getByText('Word for word, as published.', { exact: true })).toHaveCount(0);
    for (const [token, value] of tokens.slice(0, 2).map((token,index)=>[token,`AURORA 王国 ${index}`] as const)) {
      await page.getByRole('radiogroup', { name: token, exact: true }).getByRole('radio', { name: chinese ? '自定义' : 'Custom', exact: true }).check();
      await page.getByRole('textbox', { name: token, exact: true }).fill(value);
      await expect(body).toContainText(value);
    }
    await expect.poll(async () => new URL((await page.locator('[data-generation-cta]').getAttribute('href'))!).searchParams.get('prompts')).toBe(`创建一个关于的 HTML 网页\n\n${await body.textContent()}`);
    expect(await body.textContent()).not.toContain(tokens[0]);
    await page.getByRole('button', { name: chinese ? '重置占位符' : 'Reset placeholders', exact: true }).click();
    await expect(body).toHaveText(template!);
    await expect.poll(async () => new URL((await page.locator('[data-generation-cta]').getAttribute('href'))!).searchParams.get('prompts')).toBe(`创建一个关于的 HTML 网页\n\n${template}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole('heading', { name: chinese ? '设置占位符' : 'Set the placeholders', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${locale}-website-placeholders.png`), animations: 'disabled' });
  }
});

test('website template remains readable with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${process.env.FRONTEND_TEST_URL ?? 'http://127.0.0.1:3000'}/en/prompts/${slug}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-prompt]')).toContainText(/\[[A-Z][A-Z0-9_]*\]/);
  await expect(page.locator('[data-prompt]')).toContainText('<motion_qa>');
  await expect(page.locator('[data-generation-cta]')).toHaveAttribute('href', /prompts=/);
  await context.close();
});
