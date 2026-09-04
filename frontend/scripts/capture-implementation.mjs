import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
await mkdir('evidence/implementation', { recursive: true });
const report = [];
const routes = { l1: '/zh-CN/prompts', l2: '/zh-CN/prompts/image', l2v: '/zh-CN/prompts/video', l3: '/zh-CN/prompts/models/nano-banana-pro', l4: '/zh-CN/prompts/country-miniature-stamp-poster' };
try {
  for (const width of [1440, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'light', deviceScaleFactor: 1 });
    const page = await context.newPage();
    for (const [key, route] of Object.entries(routes)) {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: 'domcontentloaded' });
      await page.locator('main h1').waitFor();
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2500))]));
      await page.screenshot({ path: `evidence/implementation/${key}-${width}.png` });
      const metrics = await page.evaluate(() => ({
        h1: document.querySelector('h1')?.textContent,
        overflow: document.documentElement.scrollWidth > innerWidth,
        imagesLoaded: [...document.images].filter(image => image.complete && image.naturalWidth).length,
        images: document.images.length,
        fonts: document.fonts.status,
      }));
      report.push({ key, width, status: response.status(), ...metrics, errors });
      console.log(key, width, response.status(), JSON.stringify(metrics));
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile('evidence/implementation/capture.json', JSON.stringify(report, null, 2));
