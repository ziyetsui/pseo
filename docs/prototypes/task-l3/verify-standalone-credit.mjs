import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const names=['Current','Colophon','Signature','Plaque','Kinetic'];
const LINKS={'Vincent Wu':'https://x.com/VincentWu11','Steve Li':'https://x.com/st3v3li'};
const url='http://127.0.0.1:8766/proto-l1-credit.html';
const browser=await chromium.launch();await mkdir('evidence/standalone-credit',{recursive:true});const report=[];
for(const width of [1440,375]){
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,160))});
 await page.goto(url);await page.waitForTimeout(400);
 const baseline=await page.evaluate(()=>{const s=document.querySelector('.argument').cloneNode(true);
  s.querySelectorAll('.cr').forEach(el=>el.remove());return s.outerHTML});
 for(let v=0;v<names.length;v++){
  await page.getByRole('button',{name:names[v],exact:true}).click();
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1100);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow,names[v]).toBe(false);
  await page.screenshot({path:`evidence/standalone-credit/${v+1}-${names[v].toLowerCase()}-${width}.png`});
  const same=await page.evaluate(()=>{const s=document.querySelector('.argument').cloneNode(true);
   s.querySelectorAll('.cr').forEach(el=>el.remove());return s.outerHTML});
  expect(same,`${names[v]} changed the block above the credit`).toBe(baseline);
  const links=await page.locator('.cr a').evaluateAll(l=>l.map(a=>({text:a.innerText.trim(),href:a.getAttribute('href'),rel:a.getAttribute('rel'),target:a.getAttribute('target')})));
  if(v>0){
   expect(links.length).toBe(2);
   for(const link of links){
    expect(Object.values(LINKS)).toContain(link.href);
    expect(link.rel).toContain('noopener');expect(link.target).toBe('_blank');
   }
  }
  const axe=await new AxeBuilder({page}).include('main').analyze();
  const bottom=v===0?null:await page.evaluate(()=>Math.round(document.querySelector('.cr').getBoundingClientRect().bottom+scrollY));
  report.push({variant:names[v],width,overflow,bottom,links:links.length,
   violations:axe.violations.map(x=>({id:x.id,impact:x.impact,targets:x.nodes.map(n=>n.target)}))});
 }
 await page.keyboard.press('5');
 await expect(page.getByRole('button',{name:'Kinetic',exact:true})).toHaveAttribute('aria-current','true');
 await page.waitForTimeout(900);
 await page.getByRole('button',{name:'Replay animation (R)'}).click();
 await page.waitForTimeout(120);
 const running=await page.evaluate(()=>[...document.querySelectorAll('.cr-glyph')].some(el=>el.getAnimations().some(a=>a.playState==='running')));
 expect(running,'replay did not re-run the entrance').toBe(true);
 await expect(page).toHaveURL(/\?v=5$/);
 await page.reload();
 await expect(page.getByRole('button',{name:'Kinetic',exact:true})).toHaveAttribute('aria-current','true');
 await context.close();
 const calm=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 const calmPage=await calm.newPage();
 await calmPage.goto(url+'?v=5');await calmPage.waitForTimeout(600);
 const moving=await calmPage.evaluate(()=>[...document.querySelectorAll('.cr *')].some(el=>el.getAnimations().some(a=>a.playState==='running')));
 expect(moving,'reduced motion still animates').toBe(false);
 await expect(calmPage.locator('.cr a').first()).toBeVisible();
 await calm.close();
 report.push({width,errors});expect(errors).toEqual([]);
}
await writeFile('evidence/standalone-credit/review.json',JSON.stringify(report,null,2));await browser.close();
console.log(report.filter(r=>r.violations).map(r=>`${r.variant}@${r.width}: ${r.violations.length?JSON.stringify(r.violations):'axe clean'}, ${r.links} links, ends y=${r.bottom??'—'}`).join('\n'));
console.log('errors:',JSON.stringify(report.filter(r=>r.errors).map(r=>r.errors)));
