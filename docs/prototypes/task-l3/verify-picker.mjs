import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const SURFACES=[{label:'L1 first screen',names:['Current','Board','Quilt','Statement','Split']},
                {label:'Browse by task',names:['Current','Plate','Ledger','Field','Directory']},
                {label:'Task page',names:['Current','Matrix','Lanes','Index']},
                {label:'First-screen credit',names:['Current','Colophon','Signature','Plaque','Kinetic']}];
const url='http://127.0.0.1:8766/proto-picker.html';
const browser=await chromium.launch();await mkdir('evidence/picker',{recursive:true});const report=[];
for(const width of [1440,375]){
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});
 const page=await context.newPage();const errors=[];
 /* Only this file's own frame: variant 1 of the task surface embeds the running production app,
    and its console belongs to that app, not to the picker. */
 page.on('console',m=>{const from=m.location()?.url||'';
  if(m.type()==='error'&&!from.includes(':3000'))errors.push('console: '+m.text().slice(0,200));});
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));
 await page.goto(url);
 for(let s=0;s<SURFACES.length;s++){
  await page.getByRole('button',{name:SURFACES[s].label,exact:true}).click();
  for(let v=0;v<SURFACES[s].names.length;v++){
   await page.locator('.proto-picker-item').nth(v).click();
   if(s===3) await page.waitForTimeout(120);
   await expect(page.locator('.proto-picker-item').nth(v)).toHaveAttribute('aria-current','true');
   await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(()=>{const imgs=[...document.querySelectorAll('#stage img')];imgs.forEach(i=>{i.loading='eager'});
    return Promise.race([Promise.all(imgs.map(i=>i.complete?null:new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true})}))),new Promise(r=>setTimeout(r,5000))])});
   await page.waitForTimeout(s===3?1100:350);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
   expect(overflow,`${SURFACES[s].label}/${SURFACES[s].names[v]}@${width}`).toBe(false);
   await page.screenshot({path:`evidence/picker/s${s+1}-${v+1}-${SURFACES[s].names[v].toLowerCase()}-${width}.png`});
   const dead=await page.locator('#stage a').evaluateAll(l=>l.filter(a=>{const h=a.getAttribute('href');return !h||h==='#'}).length);
   expect(dead,'placeholder links').toBe(0);
   const axe=await new AxeBuilder({page}).include('#stage').analyze();
   report.push({surface:SURFACES[s].label,variant:SURFACES[s].names[v],width,overflow,
     violations:axe.violations.map(x=>({id:x.id,impact:x.impact,targets:x.nodes.map(n=>n.target)}))});
  }
 }
 // A task entry in the band opens the task surface for that task, in place.
 await page.goto(url+'?s=2&v=3');
 await page.locator('.bx-name').first().click();
 await expect(page).toHaveURL(/s=3.*task=/);
 // Arriving lands on the task surface's own baseline — the shipped filtered library in an iframe,
 // which is where that entry goes today. The directions are 2-4.
 await expect(page.locator('iframe.current-frame')).toHaveCount(1);
 await page.locator('.proto-picker-item').nth(1).click();
 await expect(page.locator('.task-heading h1')).toContainText('prompts');
 // A plate cell arrives with the model applied and removable.
 await page.goto(url+'?s=2&v=2');
 await page.locator('.bx-cell').first().click();
 await page.locator('.proto-picker-item').nth(1).click();
 await expect(page.locator('.filter-chip')).toBeVisible();
 const scoped=await page.locator('.result-count').innerText();
 await page.locator('.filter-chip').click();
 const cleared=await page.locator('.result-count').innerText();
 expect(scoped).not.toBe(cleared);
 // The task page's own state: search, type filter, matrix selection, the preview dialog.
 await page.goto(url+'?s=3&v=2&task=beauty');
 const before=await page.locator('.result-count').innerText();
 await page.getByRole('searchbox').fill('zzz-nothing');
 await expect(page.getByText('No prompts match this search.')).toBeVisible();
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();
 await expect(page.locator('.result-count')).toHaveText(before);
 await page.getByRole('button',{name:'Videos',exact:true}).click();
 await expect(page.locator('.result-count')).not.toHaveText(before);
 await page.getByRole('button',{name:'All',exact:true}).click();
 await page.locator('.task-matrix td button').first().click();
 await expect(page.locator('.task-matrix td button[aria-pressed=true]')).toHaveCount(1);
 await page.getByRole('button',{name:'Clear selection',exact:true}).click();
 await page.locator('.card-image').first().click();
 await expect(page.locator('dialog.task-dialog')).toBeVisible();
 await expect(page.locator('dialog .detail-copy pre')).not.toBeEmpty();
 await page.keyboard.press('Escape');
 await expect(page.locator('dialog.task-dialog')).not.toBeVisible();
 // Keyboard contract: numbers and arrows for variants, brackets for surfaces, and it all reloads.
 await page.keyboard.press('4');
 await expect(page.locator('.proto-picker-item').nth(3)).toHaveAttribute('aria-current','true');
 await page.keyboard.press('[');
 await expect(page.getByRole('button',{name:'Browse by task',exact:true})).toHaveAttribute('aria-current','true');
 await expect(page).toHaveURL(/s=2/);
 await page.reload();
 await expect(page.getByRole('button',{name:'Browse by task',exact:true})).toHaveAttribute('aria-current','true');
 // The credit surface: the block above it never moves, both links are the supplied ones, the
 // replay re-runs the entrance, and reduced motion stops all of it.
 await page.goto(url+'?s=4&v=1');await page.waitForTimeout(600);
 const creditBaseline=await page.evaluate(()=>{const a=document.querySelector('.argument').cloneNode(true);
  a.querySelectorAll('.cr').forEach(el=>el.remove());return a.outerHTML});
 const REAL={'Vincent Wu':'https://x.com/VincentWu11','Steve Li':'https://x.com/st3v3li'};
 for(let v=1;v<5;v++){
  await page.locator('.proto-picker-item').nth(v).click();await page.waitForTimeout(1100);
  const same=await page.evaluate(()=>{const a=document.querySelector('.argument').cloneNode(true);
   a.querySelectorAll('.cr').forEach(el=>el.remove());return a.outerHTML});
  expect(same,'credit variant '+v+' moved the block above it').toBe(creditBaseline);
  const links=await page.locator('.cr a').evaluateAll(l=>l.map(a=>({href:a.getAttribute('href'),rel:a.getAttribute('rel'),target:a.getAttribute('target')})));
  expect(links.length).toBe(2);
  for(const link of links){expect(Object.values(REAL)).toContain(link.href);
   expect(link.rel).toContain('noopener');expect(link.target).toBe('_blank');}
 }
 await page.getByRole('button',{name:'Replay animation (R)'}).click();await page.waitForTimeout(150);
 expect(await page.evaluate(()=>[...document.querySelectorAll('.cr-glyph')].some(el=>el.getAnimations().some(a=>a.playState==='running'))),
  'replay did not re-run the entrance').toBe(true);
 // The replay control exists only where there is an entrance.
 await page.goto(url+'?s=2&v=2');await page.waitForTimeout(400);
 expect(await page.locator('.proto-picker-replay').count(),'replay on a static surface').toBe(0);
 report.push({width,errors});expect(errors).toEqual([]);
 await page.close();await context.close();
 // Reduced motion: nothing under the credit animates, and it stays fully readable.
 const calm=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 const calmPage=await calm.newPage();
 await calmPage.goto(url+'?s=4&v=5');await calmPage.waitForTimeout(800);
 expect(await calmPage.evaluate(()=>[...document.querySelectorAll('.cr *')].some(el=>el.getAnimations().some(a=>a.playState==='running'))),
  'reduced motion still animates').toBe(false);
 await expect(calmPage.locator('.cr a').first()).toBeVisible();
 await calm.close();
}
await writeFile('evidence/picker/review.json',JSON.stringify(report,null,2));await browser.close();
const bad=report.filter(r=>r.violations?.length);
console.log(bad.length?JSON.stringify(bad,null,1):'axe clean on all '+report.filter(r=>r.violations).length+' passes');
console.log('errors:',JSON.stringify(report.filter(r=>r.errors).map(r=>r.errors)));
