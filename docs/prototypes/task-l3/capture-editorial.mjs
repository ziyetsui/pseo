import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
try{
 await page.goto('http://127.0.0.1:8767/editorial/beauty?v=3');
 await page.locator('.ed-claim').first().evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
 await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>{const i=document.querySelector('.ed-specimen img');return i instanceof HTMLImageElement&&i.complete&&i.naturalWidth>0});await page.waitForTimeout(350);
 await page.screenshot({path:new URL('./evidence/editorial/manifesto-reading-1440.png',import.meta.url).pathname});
 const href=await page.locator('.ed-generate').first().getAttribute('href');
 const response=await page.goto(href);expect(response.status()).toBe(200);await expect(page.locator('h1')).toContainText('Overhead portrait');
 await writeFile(new URL('./evidence/editorial/l4-navigation.json',import.meta.url),JSON.stringify({url:page.url(),status:response.status(),heading:await page.locator('h1').innerText()},null,2));
 console.log('Actual L4 navigation: 200, matching prompt heading.');
}finally{await browser.close()}
