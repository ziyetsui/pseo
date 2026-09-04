import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const dir = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const metrics = [];
for (const [name, url] of [['reference','/proto/model-hero?v=3'],['family','/zh-CN/prompts/model-families/nano-banana'],['video','/zh-CN/prompts/models/seedance']]) {
 await page.goto('http://127.0.0.1:3000'+url); await page.locator(name==='reference'?'.mh-h-ticker':'.model-signature').waitFor(); await page.evaluate(()=>document.fonts.ready);
 for (const width of [1440,375]) {
  await page.setViewportSize({width,height:900});
  await page.screenshot({path:dir+`${name}-${width}.png`});
  metrics.push({name,width,h1:await page.locator('h1').allTextContents(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)});
 }
}
await fs.writeFile(dir+'visual-metrics.json',JSON.stringify(metrics,null,2));
await browser.close();
