import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const names=['Current','Plate','Ledger','Field','Directory'];
const browser=await chromium.launch();await mkdir('evidence/browse',{recursive:true});const report=[];
for(const width of [1440,375]){
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8767/browse');
 for(let v=0;v<names.length;v++){
  await page.getByRole('button',{name:names[v],exact:true}).click();
  await expect(page.locator('#tasks h2')).toHaveText('Browse by task');
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{const y=document.getElementById('tasks').getBoundingClientRect().top+scrollY-24;scrollTo({top:y,behavior:'instant'})});
  await page.waitForTimeout(600);
  // Lazy media in the band has to be settled before a screenshot, or an empty mosaic cell reads as
  // a layout bug. Bounded: decode() on an image the browser has not fetched yet never settles.
  await page.evaluate(()=>{const imgs=[...document.querySelectorAll('#tasks img')];imgs.forEach(i=>{i.loading='eager'});
   return Promise.race([Promise.all(imgs.map(i=>i.complete?null:new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true})}))),new Promise(r=>setTimeout(r,4000))])});
  await page.waitForTimeout(400);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({path:`evidence/browse/${v+1}-${names[v].toLowerCase()}-${width}.png`});
  const axe=await new AxeBuilder({page}).include('#tasks').analyze();
  const entries=await page.locator('#tasks a[href*="/tasks/"]').count();
  report.push({variant:names[v],width,overflow,entries,violations:axe.violations.map(x=>({id:x.id,impact:x.impact,targets:x.nodes.map(n=>n.target)}))});
  // Every direction must reach every task; the shipped tiles silently drop the one with no image.
  const tasks=await page.locator('#tasks').getByText('Automotive',{exact:false}).count();
  report.push({variant:names[v],width,automotiveVisible:tasks>0});
 }
 // The plate's promise: a cell opens the task page with that model already applied.
 await page.getByRole('button',{name:'Plate',exact:true}).click();
 const cell=page.locator('.bx-cell').first();
 const href=await cell.getAttribute('href');
 await cell.click();
 await expect(page).toHaveURL(/\/tasks\/[^?]+\?model=/);
 // Variant 1 of the task page is the iframed production filter, which carries the model in its own
 // URL; the chip belongs to the prototype's own explorer, so read it there.
 await expect(page.frameLocator('iframe').locator('body')).toContainText('prompt', {timeout: 15000});
 await page.getByRole('button',{name:'Matrix',exact:true}).click();
 await expect(page.locator('.filter-chip')).toBeVisible();
 const scoped=await page.locator('.result-count').innerText();
 await page.screenshot({path:`evidence/browse/plate-cell-${width}.png`});
 await page.locator('.filter-chip').click();
 const cleared=await page.locator('.result-count').innerText();
 expect(scoped).not.toBe(cleared);
 await expect(page.locator('.filter-chip')).toHaveCount(0);
 report.push({width,cellHref:href,scoped,cleared});
 // And a plain task name opens the same page unfiltered.
 await page.goto('http://127.0.0.1:8767/browse?v=3');
 await page.locator('.bx-name').first().click();
 await expect(page).toHaveURL(/\/tasks\/beauty$/);
 await page.getByRole('button',{name:'Matrix',exact:true}).click();
 await expect(page.locator('h1')).toContainText('Beauty prompts');
 await expect(page.locator('.result-count')).toHaveText('13 / 13 prompts');
 await expect(page.locator('.filter-chip')).toHaveCount(0);
 // Back link returns to the band it came from.
 await page.getByRole('link',{name:'Browse by task ↗'}).click();
 await expect(page).toHaveURL(/\/browse#tasks$/);
 // Selection survives a reload.
 await page.goto('http://127.0.0.1:8767/browse?v=5');
 await expect(page.getByRole('button',{name:'Directory',exact:true})).toHaveAttribute('aria-current','true');
 report.push({width,errors});
 expect(errors).toEqual([]);
 await page.close();await context.close();
}
await writeFile('evidence/browse/review.json',JSON.stringify(report,null,2));await browser.close();
console.log(JSON.stringify(report.filter(r=>r.violations?.length||r.errors?.length||r.cellHref||r.automotiveVisible===false),null,2));
console.log('variants ok');
