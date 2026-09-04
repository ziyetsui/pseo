import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const names=['Current','Board','Quilt','Statement','Split'];
const browser=await chromium.launch();await mkdir('evidence/first',{recursive:true});const report=[];
for(const width of [1440,375]){
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
 await page.goto('http://127.0.0.1:8767/first');
 for(let v=0;v<names.length;v++){
  await page.getByRole('button',{name:names[v],exact:true}).click();
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.evaluate(()=>{const imgs=[...document.querySelectorAll('main img')];imgs.forEach(i=>{i.loading='eager'});
   return Promise.race([Promise.all(imgs.map(i=>i.complete?null:new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true})}))),new Promise(r=>setTimeout(r,5000))])});
  await page.waitForTimeout(400);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.screenshot({path:`evidence/first/${v+1}-${names[v].toLowerCase()}-${width}.png`});
  await page.screenshot({path:`evidence/first/${v+1}-${names[v].toLowerCase()}-${width}-full.png`,fullPage:true});
  const axe=await new AxeBuilder({page}).include('main').analyze();
  // Both decks must be reachable from every direction, and nothing may point at a placeholder.
  const l2=await page.locator('main a[href*="/prompts/image"],main a[href*="/prompts/video"]').evaluateAll(list=>list.map(a=>a.getAttribute('href')));
  const dead=await page.locator('main a').evaluateAll(list=>list.filter(a=>{const h=a.getAttribute('href');return !h||h==='#'}).length);
  expect(dead).toBe(0);
  expect(l2.some(h=>h.includes('/prompts/image'))&&l2.some(h=>h.includes('/prompts/video'))).toBe(true);
  // How much of the first screen is spent before anything is reachable.
  const firstLink=await page.evaluate(()=>{const a=document.querySelector('main a[href]');return a?Math.round(a.getBoundingClientRect().top+scrollY):null});
  report.push({variant:names[v],width,overflow,l2:l2.length,firstLinkY:firstLink,violations:axe.violations.map(x=>({id:x.id,impact:x.impact,targets:x.nodes.map(n=>n.target)}))});
 }
 // The board's cells open the deck already filtered to that task.
 await page.getByRole('button',{name:'Board',exact:true}).click();
 const cell=page.locator('.fs-cell[href]').first();
 const href=await cell.getAttribute('href');
 expect(href).toMatch(/\/prompts\/(image|video)\?useCase=/);
 report.push({width,cellHref:href});
 await page.keyboard.press('3');
 await expect(page.getByRole('button',{name:'Quilt',exact:true})).toHaveAttribute('aria-current','true');
 await page.reload();
 await expect(page.getByRole('button',{name:'Quilt',exact:true})).toHaveAttribute('aria-current','true');
 report.push({width,errors});expect(errors).toEqual([]);
 await page.close();await context.close();
}
await writeFile('evidence/first/review.json',JSON.stringify(report,null,2));await browser.close();
console.log(report.filter(r=>r.violations).map(r=>`${r.variant}@${r.width}: ${r.violations.length?JSON.stringify(r.violations):'axe clean'}, ${r.l2} deck links, first link at y=${r.firstLinkY}`).join('\n'));
console.log('cells:',JSON.stringify(report.filter(r=>r.cellHref).map(r=>r.cellHref)));
console.log('errors:',JSON.stringify(report.filter(r=>r.errors).map(r=>r.errors)));
