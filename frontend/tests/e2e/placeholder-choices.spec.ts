import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('every placeholder offers choices, fills exact values and preserves custom editing', async ({ page }) => {
  await page.goto('/zh-CN/prompts/prompt-portrait-photography-from-above-ana-d-2015726421990056336');
  const original = await page.locator('[data-prompt]').textContent() ?? '';
  let validJson = true;
  try { JSON.parse(original); } catch { validJson = false; }
  const groups = page.getByRole('radiogroup');
  expect(await groups.count()).toBeGreaterThan(0);
  await expect(page.locator('.recipe-placeholder-form input[type=text]')).toHaveCount(0);
  for (const group of await groups.all()) {
    expect(await group.getByRole('radio').count()).toBeGreaterThanOrEqual(3);
    await expect(group.getByRole('radio', { name: 'Custom', exact: true })).toBeVisible();
    const choice = group.getByRole('radio').first();
    await choice.check();
    await expect(choice).toBeChecked();
    await expect(page.locator('[data-prompt]')).toContainText(await choice.inputValue());
  }
  await expect(page.getByRole('status')).toContainText('All placeholders are filled.');
  const payload = await page.locator('[data-prompt]').textContent();
  if (validJson) expect(() => JSON.parse(payload!)).not.toThrow();
  await page.getByRole('heading', { name: 'Set the placeholders', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `evidence/placeholder-choices/${test.info().project.name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const subject = page.getByRole('radiogroup', { name: '[SUBJECT]', exact: true });
  await subject.getByRole('radio', { name: 'Custom', exact: true }).check();
  const input = page.getByRole('textbox', { name: '[SUBJECT]', exact: true });
  await input.fill('A person with a "red" hat');
  const customized = await page.locator('[data-prompt]').textContent();
  expect(customized).toContain(validJson ? JSON.stringify('A person with a "red" hat').slice(1, -1) : 'A person with a "red" hat');
  if (validJson) expect(() => JSON.parse(customized!)).not.toThrow();
  await subject.getByRole('radio').first().check();
  await subject.getByRole('radio', { name: 'Custom', exact: true }).check();
  await expect(input).toHaveValue('A person with a "red" hat');
  await page.getByRole('button', { name: 'Reset placeholders' }).click();
  await expect(page.locator('.recipe-placeholder-form input:checked')).toHaveCount(0);
  await expect(page.locator('[data-prompt]')).toContainText('[SUBJECT]');
  const first = groups.first().getByRole('radio').first();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(groups.first().getByRole('radio').nth(1)).toBeChecked();
  const audit = await new AxeBuilder({ page }).include('.recipe-placeholder-form').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
});
