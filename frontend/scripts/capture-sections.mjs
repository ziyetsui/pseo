import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const sections = [
  { key: 'l1-results', page: 'l1', route: '/zh-CN/prompts', selector: '#results' },
  { key: 'l1-browse', page: 'l1', route: '/zh-CN/prompts', selector: '#category' },
  { key: 'l1-footer', page: 'l1', route: '/zh-CN/prompts', selector: 'footer.foot' },
  { key: 'l2-deck', page: 'l2', route: '/zh-CN/prompts/image', selector: '.deckwrap' },
  { key: 'l2-footer', page: 'l2', route: '/zh-CN/prompts/image', selector: 'footer.foot' },
  { key: 'l3-body', page: 'l3', route: '/zh-CN/prompts/models/nano-banana-pro', selector: '.anth .entry' },
  { key: 'l3-scratchpad', page: 'l3', route: '/zh-CN/prompts/models/nano-banana-pro', selector: '.genbox' },
];
const report = [];
try {
  await mkdir('evidence/sections', { recursive: true });
  for (const width of [1440, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'light', deviceScaleFactor: 1 });
    for (const target of sections) {
      for (const source of ['reference', 'implementation']) {
        const page = await context.newPage();
        const url = source === 'reference' ? `http://127.0.0.1:8765/${target.page}.html` : `http://127.0.0.1:3000${target.route}`;
        const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.locator(target.selector).first().waitFor();
        await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2000))]));
        await page.locator(target.selector).first().evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' }));
        await page.waitForFunction(() => [...document.images].filter(image => { const rect = image.getBoundingClientRect(); return rect.bottom > 0 && rect.top < innerHeight && (!image.closest(".dc") || image.closest(".dc").hasAttribute("data-top")); }).every(image => image.complete), undefined, { timeout: 8000 }).catch(() => {});
        const metrics = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          navTop: document.querySelector(".nav")?.getBoundingClientRect().top,
          images: [...document.images].filter(image => { const rect = image.getBoundingClientRect(); return rect.bottom > 0 && rect.top < innerHeight && (!image.closest(".dc") || image.closest(".dc").hasAttribute("data-top")); }).map(image => ({ src: image.currentSrc, loaded: image.complete && image.naturalWidth > 0 })),
          footerLinks: document.querySelectorAll('footer.foot a').length,
          visibleCopyButtons: [...document.querySelectorAll('button')].filter(button => { const rect = button.getBoundingClientRect(); return /Copy/.test(button.textContent) && rect.bottom > 0 && rect.top < innerHeight; }).length,
        }));
        const path = `evidence/sections/${source}-${target.key}-${width}.png`;
        await page.screenshot({ path });
        report.push({ source, section: target.key, width, status: response.status(), screenshot: path, ...metrics });
        console.log(source, target.key, width, 'images', metrics.images.filter(image => image.loaded).length, '/', metrics.images.length, 'overflow', metrics.overflow);
        await page.close();
      }
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile('evidence/sections/capture.json', JSON.stringify(report, null, 2));
