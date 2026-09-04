import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
await mkdir('evidence/reference', { recursive: true });
const report = [];
try {
  for (const width of [1440, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'light', deviceScaleFactor: 1 });
    const page = await context.newPage();
    for (const key of ['l1', 'l2', 'l2v', 'l3', 'l4']) {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:8765/${key}.html`, { waitUntil: 'domcontentloaded' });
      await page.locator('#stage h1').waitFor();
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2500))]));
      await page.screenshot({ path: `evidence/reference/${key}-${width}.png` });
      const metrics = await page.evaluate(() => ({
        h1: document.querySelector('h1')?.textContent,
        overflow: document.documentElement.scrollWidth > innerWidth,
        imagesLoaded: [...document.images].filter(image => image.complete && image.naturalWidth).length,
        images: document.images.length,
        fonts: document.fonts.status,
      }));
      report.push({ key, width, ...metrics, errors });
      console.log(key, width, JSON.stringify(metrics));
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile('evidence/reference/capture.json', JSON.stringify(report, null, 2));
