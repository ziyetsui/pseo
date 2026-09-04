import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const targets = [
  { key: 'l1-320', width: 320, page: 'l1', route: '/zh-CN/prompts', selector: 'h1', scroll: false },
  { key: 'l2-deck-768', width: 768, page: 'l2', route: '/zh-CN/prompts/image', selector: '.deckwrap', scroll: true },
  { key: 'l3-1024', width: 1024, page: 'l3', route: '/zh-CN/prompts/models/nano-banana-pro', selector: 'h1', scroll: false },
];
const report = [];
const browser = await chromium.launch({ headless: true });
try {
  await mkdir('evidence/responsive', { recursive: true });
  for (const target of targets) {
    const context = await browser.newContext({ viewport: { width: target.width, height: 900 }, colorScheme: 'light', deviceScaleFactor: 1 });
    for (const source of ['reference', 'implementation']) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(source === 'reference' ? `http://127.0.0.1:8765/${target.page}.html` : `http://127.0.0.1:3000${target.route}`, { waitUntil: 'domcontentloaded' });
      await page.locator(target.selector).first().waitFor();
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 3000))]));
      if (target.scroll) await page.locator(target.selector).first().evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' }));
      await page.waitForFunction(() => [...document.images].filter(image => { const box = image.getBoundingClientRect(); return box.bottom > 0 && box.top < innerHeight && (!image.closest('.dc') || image.closest('.dc').hasAttribute('data-top')); }).every(image => image.complete), undefined, { timeout: 8000 }).catch(() => {});
      const measurements = await page.evaluate(() => {
        const selectors = ['h1', '.argument .body', '.deck', '.dc[data-top]', '.dc[data-top] .media', '.dc[data-top] .side', '.toc'];
        const boxes = Object.fromEntries(selectors.flatMap(selector => {
          const element = document.querySelector(selector); if (!element) return [];
          const box = element.getBoundingClientRect(), css = getComputedStyle(element);
          return [[selector, { x: box.x, y: box.y, width: box.width, height: box.height, fontSize: css.fontSize, fontFamily: css.fontFamily, lineHeight: css.lineHeight }]];
        }));
        const images = [...document.images].filter(image => { const box = image.getBoundingClientRect(); return box.bottom > 0 && box.top < innerHeight && (!image.closest('.dc') || image.closest('.dc').hasAttribute('data-top')); }).map(image => ({ src: image.currentSrc, loaded: image.complete && image.naturalWidth > 0 }));
        return { overflow: document.documentElement.scrollWidth > innerWidth, fonts: document.fonts.status, boxes, images };
      });
      const screenshot = `evidence/responsive/${source}-${target.key}.png`;
      await page.screenshot({ path: screenshot });
      report.push({ source, key: target.key, width: target.width, height: 900, status: response.status(), screenshot, ...measurements, errors });
      console.log(source, target.key, JSON.stringify({ status: response.status(), overflow: measurements.overflow, images: measurements.images, errors }));
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile('evidence/responsive/capture.json', JSON.stringify(report, null, 2));
