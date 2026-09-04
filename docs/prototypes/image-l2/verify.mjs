import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch();const reports=[];
for(const width of [1440,375]){
const context=await browser.newContext({viewport:{width,height:1000},isMobile:width===375,hasTouch:width===375});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(let v=1;v<=4;v++){
await page.goto(`http://127.0.0.1:8768/?v=${v}`);await page.waitForTimeout(700);await page.evaluate(()=>document.fonts.ready);
await expect(page.locator('.proto-picker [data-active]')).toHaveCount(1);
if(v===1){await expect(page.frameLocator('iframe').getByRole('heading',{level:1})).toHaveText('Image prompts');}
else{
await expect(page.getByRole('heading',{level:1})).toHaveText('Image prompts');
await expect(page.getByRole('button',{name:/copy/i})).toHaveCount(0);
await page.getByRole('searchbox').fill('no-result-19283746');await expect(page.getByText('No image prompts match.')).toBeVisible();await page.getByRole('button',{name:'Clear filters',exact:true}).last().click();
if(v===2){const cell=page.locator('.cell').first();const n=await cell.innerText();await cell.click();await expect(page.locator('.prompt-card')).toHaveCount(Number(n));await page.getByRole('button',{name:'Clear filters',exact:true}).first().click();}
if(v===4){await page.locator('.index-row').nth(1).click();await expect(page.locator('.reader')).toContainText(await page.locator('.index-row').nth(1).locator('strong').innerText());}
const href=await page.getByRole('link',{name:/Generate image/}).first().getAttribute('href');expect(href).toMatch(/^http:\/\/127\.0\.0\.1:3000\/zh-CN\/prompts\/[^/?]+$/);
const axe=await new AxeBuilder({page}).exclude('.proto-picker').analyze();reports.push({width,v,axe:axe.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.map(n=>n.target)})),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
}
await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`evidence/v${v}-${width}.png`,fullPage:false});
if(v>1){await page.locator('.results-heading').scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/v${v}-${width}-body.png`});}
}
await page.locator('.proto-picker-item').nth(1).click();await expect(page).toHaveURL(/v=2/);await page.reload();await expect(page.locator('.proto-picker [data-active]')).toHaveText('Matrix');await expect(page.locator('.proto-picker')).toHaveAttribute('data-ready','');await page.locator('.proto-picker-item').nth(1).focus();await page.keyboard.press('3');await expect(page.locator('.proto-picker [data-active]')).toHaveText('Atlas');await page.getByRole('searchbox').fill('1');await expect(page.locator('.proto-picker [data-active]')).toHaveText('Atlas');
reports.push({width,errors});await context.close();
}
const ref=await browser.newPage({viewport:{width:1440,height:1000}});await ref.goto('http://127.0.0.1:8766/proto-l1-system.html?v=5&theme=linear-dark');await ref.locator('.map').scrollIntoViewIfNeeded();await ref.waitForTimeout(600);await ref.screenshot({path:'evidence/reference-matrix.png'});await ref.close();
await writeFile('evidence/verification.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));await browser.close();
