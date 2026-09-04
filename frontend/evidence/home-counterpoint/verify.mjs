import { chromium } from '@playwright/test';
import { parse } from 'node-html-parser';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir = 'evidence/home-counterpoint';
const before = parse(await readFile(`${dir}/before.html`, 'utf8'));
const after = parse(await (await fetch('http://127.0.0.1:3000/zh-CN/prompts')).text());
const untouched = ['.argument h1', '.argument .body', '.after', '.foot', '.nav'];
for (const selector of untouched) assert.equal(after.querySelector(selector)?.outerHTML, before.querySelector(selector)?.outerHTML, selector);
const browser = await chromium.launch();
const results = [];
for (const width of [1440, 375]) {
  for (const reference of [true, false]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme: 'dark' });
    await page.goto(reference ? 'http://127.0.0.1:8766/proto-l1-credit-scale.html?theme=linear-dark' : 'http://127.0.0.1:3000/zh-CN/prompts');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(550);
    const credit = page.locator('.argument .cr-counter');
    assert.equal(await credit.count(), 1);
    const links = await credit.locator('a').evaluateAll(els => els.map(el => ({ text: el.textContent, href: el.href, target: el.target, rel: el.rel })));
    assert.deepEqual(links.map(l => l.href), ['https://x.com/VincentWu11','https://x.com/st3v3li']);
    await credit.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${dir}/${reference ? 'reference' : 'homepage'}-${width}.png` });
    const styles = await credit.evaluate(el => {
      const s = getComputedStyle(el), mark = getComputedStyle(el.querySelector('.cr-c-mark')), name = getComputedStyle(el.querySelector('a'));
      return { width: el.getBoundingClientRect().width, gap: s.columnGap, marginTop: s.marginTop, mark: mark.fontSize, name: name.fontSize };
    });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false);
    if (!reference) {
      await credit.locator('a').first().focus();
      await page.waitForTimeout(220);
      assert.equal(await credit.locator('a').first().evaluate(el => getComputedStyle(el,'::after').transform), 'matrix(1, 0, 0, 1, 0, 0)');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await credit.locator('.cr-c-mark').evaluate(el => getComputedStyle(el).animationName), 'none');
    }
    results.push({ width, reference, styles, links, overflow });
    await page.close();
  }
  assert.deepEqual(results.at(-1).styles, results.at(-2).styles);
}
await browser.close();
await writeFile(`${dir}/verification.json`, JSON.stringify({ unchanged: untouched, results }, null, 2));
console.log('Counterpoint matches reference at 1440/375px; links, focus, reduced motion and unchanged homepage sections verified.');
