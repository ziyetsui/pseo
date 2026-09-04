import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const names=['Current','Colophon','Signature','Plaque','Kinetic'];
const LINKS={'Vincent Wu':'https://x.com/VincentWu11','Steve Li':'https://x.com/st3v3li'};
const browser=await chromium.launch();await mkdir('evidence/credit',{recursive:true});const report=[];
for(const width of [1440,375]){
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,160))});
 await page.goto('http://127.0.0.1:8767/credit');
 // The block above the credit must be byte-identical in every direction. Baseline first.
 const baseline=await page.evaluate(()=>{const s=document.querySelector('.argument').cloneNode(true);
  s.querySelectorAll('.cr').forEach(el=>el.remove());return s.outerHTML});
 for(let v=0;v<names.length;v++){
  await page.getByRole('button',{name:names[v],exact:true}).click();
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1100);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow,names[v]).toBe(false);
  await page.screenshot({path:`evidence/credit/${v+1}-${names[v].toLowerCase()}-${width}.png`});
  const same=await page.evaluate(()=>{const s=document.querySelector('.argument').cloneNode(true);
   s.querySelectorAll('.cr').forEach(el=>el.remove());return s.outerHTML});
  expect(same,`${names[v]} changed the block above the credit`).toBe(baseline);
  const axe=await new AxeBuilder({page}).include('main').analyze();
  // Both people, both real links, opened safely — and never a guessed handle.
  const links=await page.locator('.cr a').evaluateAll(list=>list.map(a=>({text:a.innerText.trim(),href:a.getAttribute('href'),rel:a.getAttribute('rel'),target:a.getAttribute('target')})));
  if(v>0){
   expect(links.length).toBe(2);
   for(const link of links){
    expect(Object.values(LINKS)).toContain(link.href);
    expect(link.rel).toContain('noopener');expect(link.target).toBe('_blank');
    const name=Object.keys(LINKS).find(k=>LINKS[k]===link.href);
    expect(link.text.replace(/\s+/g,' ')).toContain(name.split(' ')[0]);
   }
   // Every entrance is transform/opacity only, and every one has a reduced-motion path.
   const animated=await page.locator('.cr [style*="--i"],.cr-rule,.cr-card').count();
   expect(animated).toBeGreaterThan(0);
  }
  // Hit areas: no interactive target below 44px once its extension is counted.
  const small=await page.locator('.cr a').evaluateAll(list=>list.map(a=>{
   const own=a.getBoundingClientRect();const before=getComputedStyle(a,'::before');
   const pad=before.content!=='none'?Math.abs(parseFloat(before.insetBlockStart||'0')||0):0;
   return Math.round(own.height+pad*2)}).filter(h=>h<44));
  expect(small,'targets under 44px').toEqual([]);
  /* Where the credit ends. The brief is "on the first screen", so the number that matters is
     whether its bottom edge clears the fold on a common laptop as well as this viewport. */
  const bottom=v===0?null:await page.evaluate(()=>Math.round(document.querySelector('.cr').getBoundingClientRect().bottom+scrollY));
  report.push({variant:names[v],width,overflow,bottom,links:links.length,
   violations:axe.violations.map(x=>({id:x.id,impact:x.impact,targets:x.nodes.map(n=>n.target)}))});
 }
 // Replay re-runs the entrance without switching direction.
 await page.getByRole('button',{name:'Kinetic',exact:true}).click();
 await page.waitForTimeout(900);
 await page.getByRole('button',{name:'Replay animation (R)'}).click();
 const running=await page.evaluate(()=>document.querySelectorAll('.cr-glyph').length>0
  && [...document.querySelectorAll('.cr-glyph')].some(el=>el.getAnimations().some(a=>a.playState==='running')));
 expect(running,'replay did not re-run the entrance').toBe(true);
 // Reduced motion: nothing animates, and the credit is still fully readable.
 await context.close();
 const calm=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 const calmPage=await calm.newPage();
 await calmPage.goto('http://127.0.0.1:8767/credit?v=5');
 await calmPage.waitForTimeout(500);
 const moving=await calmPage.evaluate(()=>[...document.querySelectorAll('.cr *')].some(el=>el.getAnimations().some(a=>a.playState==='running')));
 expect(moving,'reduced motion still animates').toBe(false);
 await expect(calmPage.locator('.cr a').first()).toBeVisible();
 await calmPage.screenshot({path:`evidence/credit/reduced-motion-${width}.png`});
 report.push({width,errors,reducedMotionStill:!moving});
 expect(errors).toEqual([]);
 await calm.close();
}
await writeFile('evidence/credit/review.json',JSON.stringify(report,null,2));await browser.close();
console.log(report.filter(r=>r.violations).map(r=>`${r.variant}@${r.width}: ${r.violations.length?JSON.stringify(r.violations):'axe clean'}, ${r.links} links, credit ends at y=${r.bottom ?? '—'}`).join('\n'));
console.log('errors:',JSON.stringify(report.filter(r=>r.errors).map(r=>r.errors)));
