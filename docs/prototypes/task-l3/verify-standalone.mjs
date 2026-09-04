import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const names=['Current','Plate','Ledger','Field','Directory'];
const url='http://127.0.0.1:8766/proto-browse-band.html';
const browser=await chromium.launch();await mkdir('evidence/standalone',{recursive:true});const report=[];
for(const width of [1440,375]){
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
 await page.goto(url);
 for(let v=0;v<names.length;v++){
  await page.getByRole('button',{name:names[v],exact:true}).click();
  await expect(page.locator('#tasks h2')).toHaveText('Browse by task');
  await expect(page.getByRole('button',{name:names[v],exact:true})).toHaveAttribute('aria-current','true');
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{const y=document.getElementById('tasks').getBoundingClientRect().top+scrollY-24;scrollTo({top:y,behavior:'instant'})});
  await page.evaluate(()=>{const imgs=[...document.querySelectorAll('#tasks img')];imgs.forEach(i=>{i.loading='eager'});
   return Promise.race([Promise.all(imgs.map(i=>i.complete?null:new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true})}))),new Promise(r=>setTimeout(r,4000))])});
  await page.waitForTimeout(400);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.screenshot({path:`evidence/standalone/${v+1}-${names[v].toLowerCase()}-${width}.png`});
  const axe=await new AxeBuilder({page}).include('#tasks').analyze();
  // Every entry has to point at a real destination; no href="#", no empty link.
  const hrefs=await page.locator('#tasks a').evaluateAll(list=>list.map(a=>a.getAttribute('href')));
  expect(hrefs.every(h=>h&&h!=='#')).toBe(true);
  report.push({variant:names[v],width,overflow,links:hrefs.length,violations:axe.violations.map(x=>({id:x.id,impact:x.impact,targets:x.nodes.map(n=>n.target)}))});
 }
 // Keyboard contract and reload persistence.
 await page.keyboard.press('2');
 await expect(page.getByRole('button',{name:'Plate',exact:true})).toHaveAttribute('aria-current','true');
 await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('button',{name:'Ledger',exact:true})).toHaveAttribute('aria-current','true');
 await expect(page).toHaveURL(/\?v=3$/);
 await page.reload();
 await expect(page.getByRole('button',{name:'Ledger',exact:true})).toHaveAttribute('aria-current','true');
 report.push({width,errors});expect(errors).toEqual([]);
 await page.close();await context.close();
}
await writeFile('evidence/standalone/review.json',JSON.stringify(report,null,2));await browser.close();
console.log(report.filter(r=>r.violations).map(r=>`${r.variant}@${r.width}: ${r.violations.length?JSON.stringify(r.violations):'axe clean'}, ${r.links} links, overflow=${r.overflow}`).join('\n'));
console.log('errors:',JSON.stringify(report.filter(r=>r.errors).map(r=>r.errors)));
