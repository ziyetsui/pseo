import { expect, test } from '@playwright/test';
test('every model destination shares Signature, exact templates and the Weight generation flow', async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh-CN/prompts/models');
  const destinations = await page.locator('main .tile').evaluateAll(tiles => tiles.map(tile => ({
    href: tile.getAttribute('href')!, label: tile.querySelector('h2')!.textContent!,
  })));
  expect(destinations.length).toBeGreaterThan(0);
  const visited = new Set<string>();
  for (const { href, label: modelLabel } of destinations) {
    if (visited.has(href)) continue;
    visited.add(href);
    await test.step(modelLabel + ' ' + href, async () => {
      const response = await page.goto(href);
      expect(response?.status()).toBe(200);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('.model-signature h1')).toHaveText(modelLabel);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('.crumbs')).toHaveCount(0);
      const count = await page.locator('.entry').count();
      await expect(page.locator('.msh-note').first()).toHaveText(`${count} ${count === 1 ? 'prompt' : 'prompts'}${count ? ' to build on' : ''}`);
      const versions = await page.locator('.msh-versions a').evaluateAll(links => links.map(link => ({ href: link.getAttribute('href')!, label: link.textContent! })));
      destinations.push(...versions);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('.weight-nudge')).toHaveCount(0);
      const input = page.getByRole('textbox', { name: 'Your prompt', exact: true });
      await expect(input).toHaveCount(1);
      await expect(input).toHaveValue('');
      const generate = page.locator('.msh-generate');
      await expect(generate).toHaveAttribute('href', 'https://bo.ancher.ai/home');
      await expect(generate).toHaveAttribute('target', '_blank');
      if (count) {
        const entry = page.locator('.entry').first();
        const text = await entry.locator('.body .mono').textContent() ?? '';
        const cta = entry.locator('.acts a').first();
        const label = await cta.textContent() ?? '';
        expect(label).toMatch(/^Generate(?: image| video)?$/);
        if (href.endsWith('/seedance')) expect(label).toBe('Generate video');
        const detail = await entry.locator('h4 a').getAttribute('href');
        await expect(cta).toHaveAttribute('href', detail!);
        await expect(entry.locator('.prompt-placeholder').first()).toBeVisible();
        await entry.getByRole('link', { name: label, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`${href}$`));
        await expect(input).toHaveValue(text);
        await expect(input).toBeFocused();
        await expect(input).toBeInViewport();
        await expect(generate).toHaveText(label);
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await expect(input).toHaveValue(text);
        await expect(generate).toHaveText(label);
      }
      await page.evaluate(() => {
        sessionStorage.removeItem('prompt-library:sign-in-gate:intent-shown');
        localStorage.removeItem('prompt-library:sign-in-gate:quiet-until');
      });
      await generate.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('link', { name: 'Continue to bo ↗' })).toHaveAttribute('href', 'https://bo.video/home');
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      if (href.endsWith('/seedance')) await page.screenshot({ path: `evidence/model-siblings/seedance-${test.info().project.name}.png` });
    });
  }
});
