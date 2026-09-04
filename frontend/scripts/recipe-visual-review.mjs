import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const output = 'evidence/recipe-visual';
await mkdir(output, { recursive: true });
const recheck = process.env.RECIPE_RECHECK_ONLY === '1';
const previous = recheck ? JSON.parse(await readFile(`${output}/measurements.json`, 'utf8')) : null;
const report = {
  recordedAt: new Date().toISOString(),
  reference: 'http://127.0.0.1:8765/l4.html',
  implementation: 'http://127.0.0.1:3000/zh-CN/prompts/country-miniature-stamp-poster',
  sourceSha256: createHash('sha256').update(await readFile('/tmp/pseo-prototype/l4.html')).digest('hex'),
  conditions: { height: 900, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce', referenceNormalization: 'Hide only .recbar, the removed Showing sample-selection harness.' },
  captures: previous ? previous.captures.filter(capture => capture.target === 'reference') : [],
};
if (previous && previous.sourceSha256 !== report.sourceSha256) throw new Error('The Recipe reference changed; run a complete baseline capture.');
const browser = await chromium.launch({ headless: true });
report.browser = browser.version();
try {
  for (const width of [1440, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce' });
    for (const target of recheck ? ['implementation'] : ['reference', 'implementation']) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(report[target], { waitUntil: 'domcontentloaded' });
      await page.locator('main h1').waitFor();
      await page.evaluate(async () => { await document.fonts.ready; });
      await page.waitForFunction(() => [...document.querySelectorAll('.v3 .shots img')].every(image => image.complete), undefined, { timeout: 8000 }).catch(() => {});
      if (target === 'reference') {
        await page.screenshot({ path: `${output}/${target}-${width}-raw.png` });
        await page.addStyleTag({ content: '.recbar { display: none !important; }' });
      }
      const metrics = await page.evaluate(() => {
        const pick = selector => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const rect = element.getBoundingClientRect(); const css = getComputedStyle(element);
          return { text: element.textContent, x: rect.x, y: rect.y + window.scrollY, width: rect.width, height: rect.height, font: css.fontFamily, fontSize: css.fontSize, lineHeight: css.lineHeight, fontWeight: css.fontWeight, letterSpacing: css.letterSpacing, color: css.color, background: css.backgroundColor, padding: css.padding, gap: css.gap };
        };
        return {
          title: document.querySelector('h1')?.textContent,
          htmlLang: document.documentElement.lang,
          bodyLang: document.body.lang,
          overflow: document.documentElement.scrollWidth > innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          main: pick('main > .wrap'), header: pick('.nav'), h1: pick('main h1'), byline: pick('.byline'), media: pick('.shots .ph'),
          step2: pick('section.step:nth-of-type(2)'), step3: pick('section.step:nth-of-type(3)'), step4: pick('section.step:nth-of-type(4)'),
          step2Heading: pick('section.step:nth-of-type(2) h2'), step3Heading: pick('section.step:nth-of-type(3) h2'), step4Heading: pick('section.step:nth-of-type(4) h2'),
          vars: pick('.varset'), payload: pick('.payload'), payloadBody: pick('.payload-body'), footer: pick('footer.foot'),
          choices: [...document.querySelectorAll('.varopt')].map(element => element.textContent),
          promptText: document.querySelector('[data-prompt]')?.textContent,
          images: [...document.images].map(image => ({ src: image.currentSrc || image.src, loaded: image.complete && image.naturalWidth > 0, width: image.naturalWidth, height: image.naturalHeight })),
        };
      });
      for (const area of recheck ? ['step-02', 'step-03', 'step-04'] : ['first-screen', 'step-02', 'step-03', 'step-04']) {
        if (area === 'first-screen') await page.evaluate(() => scrollTo(0, 0));
        else {
          const step = Number(area.slice(-2));
          await page.locator('section.step').nth(step - 1).evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY - 76));
        }
        await page.screenshot({ path: `${output}/${target}-${width}-${area}.png` });
      }
      report.captures.push({ target, width, status: response?.status(), metrics, errors });
      console.log(JSON.stringify({ target, width, title: metrics.title, overflow: metrics.overflow, imagesLoaded: metrics.images.filter(image => image.loaded).length, images: metrics.images.length, h1: metrics.h1, step2: metrics.step2Heading, step3: metrics.step3Heading, step4: metrics.step4Heading, choices: metrics.choices, errors }));
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(`${output}/measurements.json`, `${JSON.stringify(report, null, 2)}\n`);
