import { chromium } from '@playwright/test';
import { readFile, readdir, writeFile } from 'node:fs/promises';
const origin = process.env.FRONTEND_STATIC_TEST_URL ?? 'http://localhost:61091';
const manifest = JSON.parse(await readFile('out/frontend-build.json', 'utf8'));
if (manifest.mode !== 'public-api') throw new Error('Public smoke requires a public-api export');
// Include nested model, task, style and subject pages, not just top-level HTML.
const routes = (await readdir('out/zh-CN', { recursive: true }))
  .filter(file => file.endsWith('.html'))
  .map(file => `/zh-CN/${file.slice(0, -5)}`)
  .sort();
const browser = await chromium.launch();
const report = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  for (const route of routes) {
    const response = await page.goto(origin + route);
    if (response.status() !== 200) throw new Error(`Static route failed: ${route} ${response.status()}`);
    if (!await page.locator('main h1').isVisible()) throw new Error('Static main heading hidden');
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    jsonLd.forEach(value => JSON.parse(value));
    report.push({ route, status: response.status(), heading: await page.locator('main h1').textContent(), jsonLd: jsonLd.length, lang: await page.locator('html').getAttribute('lang') });
  }
  for (const route of ['/en/prompts', '/zh-CN/prompts/missing-record']) {
    const response = await page.goto(origin + route);
    if (response.status() !== 404) throw new Error(`Missing route did not return 404: ${route}`);
  }
  for (const prompt of manifest.publicPrompts) {
    await page.goto(origin + prompt.href);
    await page.screenshot({ path: 'evidence/public-detail.png' });
    if (!await page.locator('script[type="application/ld+json"]').count()) throw new Error('Missing public structured data');
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const noJsPage = await noJs.newPage();
  for (const route of ['/zh-CN/prompts', ...manifest.publicPrompts.map(prompt => prompt.href)]) {
    await noJsPage.goto(origin + route);
    if (!await noJsPage.locator('main h1').isVisible()) throw new Error(`No-JS content is hidden: ${route}`);
  }
  await noJs.close();
} finally { await browser.close(); }
await writeFile('evidence/public-smoke.json', JSON.stringify({ revision: manifest.revision, routes: report, missingRoutes404: true, noJs: true }, null, 2));
console.log(`Public static smoke passed: ${report.length} routes, two real 404s, structured data and no-JS content`);
