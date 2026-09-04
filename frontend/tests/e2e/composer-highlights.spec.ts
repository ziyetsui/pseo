import { expect, test } from '@playwright/test';

test('loaded templates retain colored placeholders while editing, scrolling and restoring drafts', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh-CN/prompts/model-families/nano-banana');
  await page.waitForLoadState('networkidle');
  const entry = page.locator('#e-2008952931484098637');
  const text = await entry.locator('.body .mono').textContent() ?? '';
  const expected = await entry.locator('.prompt-placeholder').allTextContents();
  await entry.getByRole('link', { name: 'Generate image', exact: true }).click();
  const input = page.locator('.msh-input');
  const mirror = page.locator('.msh-highlight');
  await expect(input).toHaveValue(text);
  await expect(input).toBeFocused();
  await expect(mirror.locator('mark')).toHaveText(expected);
  const sourceColor = await entry.locator('mark').first().evaluate(el => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
  expect(await mirror.locator('mark').first().evaluate(el => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }))).toEqual(sourceColor);
  await expect(mirror).toHaveAttribute('aria-hidden', 'true');
  await page.screenshot({ path: `evidence/composer-highlights/loaded-${test.info().project.name}.png` });

  const edited = '[SUBJECT] in [LOCATION]\n' + 'Keep every line and space.\n'.repeat(20) + '[FINAL_DETAIL]\n';
  await input.fill(edited);
  await expect(mirror.locator('mark')).toHaveText(['[SUBJECT]', '[LOCATION]', '[FINAL_DETAIL]']);
  await input.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect.poll(() => page.locator('.msh-editor').evaluate(el => {
    const textarea = el.querySelector('textarea')!;
    const layer = el.querySelector<HTMLElement>('.msh-highlight')!;
    return Math.abs(textarea.scrollTop - layer.scrollTop);
  })).toBeLessThan(1);
  await page.screenshot({ path: `evidence/composer-highlights/scrolled-${test.info().project.name}.png` });
  await input.evaluate(el => { el.style.height = '260px'; });
  await expect.poll(() => page.locator('.msh-editor').evaluate(el => {
    const textarea = el.querySelector('textarea')!;
    const layer = el.querySelector<HTMLElement>('.msh-highlight')!;
    return Math.abs(textarea.clientHeight - layer.clientHeight) + Math.abs(textarea.clientWidth - layer.clientWidth);
  })).toBe(0);
  await page.reload();
  await expect(input).toHaveValue(edited);
  await expect(mirror.locator('mark')).toHaveText(['[SUBJECT]', '[LOCATION]', '[FINAL_DETAIL]']);
  await input.fill('An actual subject, no variables.');
  await expect(mirror.locator('mark')).toHaveCount(0);
  await expect(mirror).toHaveText('An actual subject, no variables.');
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(mirror).toBeHidden();
  expect(await input.evaluate(el => getComputedStyle(el).webkitTextFillColor)).not.toBe('rgba(0, 0, 0, 0)');
});
