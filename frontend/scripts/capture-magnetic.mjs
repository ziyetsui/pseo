import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
await mkdir('evidence/magnetic', {recursive:true});
const results=[];
for (const width of [1440,375]) {
  for (const reference of [true,false]) {
    const page = await browser.newPage({viewport:{width,height:900},colorScheme:'dark'});
    await page.goto(reference ? 'http://127.0.0.1:8766/proto-continuous-peek.html?v=2&theme=linear-dark' : 'http://127.0.0.1:3000/zh-CN/prompts');
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
    await page.waitForTimeout(300);
    if(reference) await page.addStyleTag({content:'.sig,.proto-picker,.theme-toggle{display:none!important}'});
    const name = `${reference?'reference':'implementation'}-${width}`;
    await page.screenshot({path:`evidence/magnetic/${name}-hero.png`});
    await page.locator('.lede').evaluate(el=>el.scrollIntoView());
    await page.waitForTimeout(700);
    await page.screenshot({path:`evidence/magnetic/${name}-field.png`});
    const titles=await page.locator('.run .t').allTextContents();
    const layout=await page.locator('.run .t').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,y:r.y}}));
    await page.locator('.run .t').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.locator('.run .t').first().focus(); await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    await page.screenshot({path:`evidence/magnetic/${name}-peek.png`});
    results.push({name,titles,layout,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
    await page.close();
  }
}
await writeFile('evidence/magnetic/measurements.json',JSON.stringify(results,null,2));
await browser.close();
