import { expect, test } from '@playwright/test';
import { parse } from 'node-html-parser';
import { writeFileSync } from 'node:fs';

test('shared footer links only lead to populated prompt destinations', async ({ page }) => {
  const paths = ['/zh-CN/prompts/use-cases/beauty', '/zh-CN/prompts', '/zh-CN/prompts/image', '/zh-CN/prompts/model-families/nano-banana', '/zh-CN/prompts/styles/photorealistic', '/zh-CN/prompts/country-miniature-stamp-poster'];
  let expected: string[] | undefined;
  for (const path of paths) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main')).toHaveCount(1);
    const links = await page.locator('footer .footnav a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!));
    expect(links.length).toBeGreaterThan(0);
    if (expected) expect(links).toEqual(expected);
    else expected = links;
    for (const column of await page.locator('footer .footnav > div').all()) {
      expect(await column.locator('li').count()).toBeGreaterThan(0);
    }
    if (path.endsWith('/beauty')) {
      await page.locator('footer').screenshot({ path: `evidence/footer-nonempty/${test.info().project.name}.png` });
      writeFileSync(`evidence/footer-nonempty/${test.info().project.name}-links.json`, JSON.stringify(links, null, 2));
    }
  }
  for (const href of new Set(expected)) {
    const response = await page.request.get(href);
    expect(response.status(), href).toBe(200);
    const html = parse(await response.text());
    if (href.endsWith('/models') || href.endsWith('/creators') || href.includes('/subjects/')) {
      expect(html.querySelectorAll('main .tile').length, href).toBeGreaterThan(0);
    } else {
      expect(html.querySelectorAll('main [data-lg-row]').length, href).toBeGreaterThan(0);
    }
  }
});
