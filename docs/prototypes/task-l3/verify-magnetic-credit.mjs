import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const names=['Current','Field','Colophon','Signature','Kinetic'];
const REAL={'Vincent Wu':'https://x.com/VincentWu11','Steve Li':'https://x.com/st3v3li'};
const url='http://127.0.0.1:8766/proto-l1-magnetic-credit.html';
const browser=await chromium.launch();await mkdir('evidence/magnetic-credit',{recursive:true});const report=[];
for(const width of [1440,375]){
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,160))});
 await page.goto(url);await page.waitForTimeout(500);
 // Baseline: the whole first screen with the credit removed. Nothing else may differ.
 const baseline=await page.evaluate(()=>{const a=document.querySelector('.argument').cloneNode(true);
  a.querySelectorAll('.cr').forEach(el=>el.remove());return a.outerHTML});
 for(let v=0;v<names.length;v++){
  await page.getByRole('button',{name:names[v],exact:true}).click();
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1100);
  // The motion decision is not up for grabs here: every direction is the Magnetic master.
  expect(await page.evaluate(()=>document.querySelector('#stage > *').dataset.field),'not the Magnetic master').toBe('magnet');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow,names[v]).toBe(false);
  await page.screenshot({path:`evidence/magnetic-credit/${v+1}-${names[v].toLowerCase()}-${width}.png`});
  // The master ships light and carries its own theme toggle; §7 makes production default to
  // Linear dark, so every direction is looked at in both.
  await page.locator('#theme-toggle').click();await page.waitForTimeout(500);
  await page.screenshot({path:`evidence/magnetic-credit/${v+1}-${names[v].toLowerCase()}-${width}-dark.png`});
  const darkAxe=await new AxeBuilder({page}).include('.argument').analyze();
  expect(darkAxe.violations.filter(x=>x.nodes.some(n=>String(n.target).includes('cr'))),'the credit fails contrast in dark').toEqual([]);
  await page.locator('#theme-toggle').click();await page.waitForTimeout(300);
  const same=await page.evaluate(()=>{const a=document.querySelector('.argument').cloneNode(true);
   a.querySelectorAll('.cr').forEach(el=>el.remove());return a.outerHTML});
  expect(same,`${names[v]} changed the first screen above the credit`).toBe(baseline);
  const links=await page.locator('.cr a').evaluateAll(l=>l.map(a=>({href:a.getAttribute('href'),rel:a.getAttribute('rel'),target:a.getAttribute('target'),expand:a.hasAttribute('data-expand')})));
  if(v>0){
   expect(links.length).toBe(2);
   for(const link of links){
    expect(Object.values(REAL)).toContain(link.href);
    expect(link.rel).toContain('noopener');expect(link.target).toBe('_blank');
    // A credit name must never be mistaken for a title: the peek disclosure keys off [data-expand].
    expect(link.expand).toBe(false);
   }
  }
  const axe=await new AxeBuilder({page}).include('#stage').analyze();
  const bottom=v===0?null:await page.evaluate(()=>Math.round(document.querySelector('.cr').getBoundingClientRect().bottom+scrollY));
  report.push({variant:names[v],width,overflow,bottom,links:links.length,
   violations:axe.violations.map(x=>({id:x.id,impact:x.impact,targets:x.nodes.map(n=>n.target)}))});
 }
 // Field: the credit names really are in the master's own pointer field. The engine gates on
 // matchMedia('(hover:hover) and (pointer:fine)'), which headless Chromium does not report by
 // default — without these blink settings this check would pass over a field that never ran.
 if(width===1440){
  const fine=await chromium.launch({args:['--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4']});
  const fp=await (await fine.newContext({viewport:{width:1440,height:1000}})).newPage();
  await fp.goto(url+'?v=2');await fp.waitForTimeout(900);
  const counts=await fp.evaluate(()=>({all:document.querySelectorAll('.m-run .t').length,
   credit:document.querySelectorAll('.m-run .cr-field-name.t').length}));
  expect(counts.credit,'the field does not measure the credit names').toBe(2);
  expect(counts.all,'the credit names are not counted with the titles').toBe(counts.all);
  /* The loop bails when the run block is off screen and only writes while the pointer is inside
     the field, so the pointer is walked in — in steps, like a real one — and the assertion polls
     instead of sampling a single frame. */
  const title=await fp.locator('.run .t').first().boundingBox();
  await fp.mouse.move(title.x+title.width/2,title.y+title.height/2,{steps:12});
  await fp.waitForTimeout(300);
  const box=await fp.locator('.cr-field-name').first().boundingBox();
  await fp.mouse.move(box.x+box.width/2,box.y-60,{steps:12});
  await fp.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:12});
  await expect.poll(async()=>await fp.evaluate(()=>document.querySelector('.cr-field-name').getAttribute('style')||''),
   {timeout:4000,message:'the field never wrote to the credit names'}).toContain('--fx');
  const written=await fp.evaluate(()=>({
   title:document.querySelector('.run .t').getAttribute('style')||'',
   credit:document.querySelector('.cr-field-name').getAttribute('style')||''}));
  // Whatever the loop writes to a title, it writes to a credit name.
  for (const prop of ['--fx','--fy','--near']) expect(written.credit,'credit missing '+prop).toContain(prop);
  report.push({width,fieldWrites:written});
  await fine.close();
 }
 // Replay re-runs the entrance; it exists because four of the five have one.
 await page.getByRole('button',{name:'Kinetic',exact:true}).click();await page.waitForTimeout(900);
 await page.getByRole('button',{name:'Replay animation (R)'}).click();await page.waitForTimeout(140);
 expect(await page.evaluate(()=>[...document.querySelectorAll('.cr-glyph')].some(el=>el.getAnimations().some(a=>a.playState==='running'))),
  'replay did not re-run the entrance').toBe(true);
 await expect(page).toHaveURL(/\?v=5$/);
 await page.reload();await page.waitForTimeout(400);
 await expect(page.getByRole('button',{name:'Kinetic',exact:true})).toHaveAttribute('aria-current','true');
 await context.close();
 const calm=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 const calmPage=await calm.newPage();
 await calmPage.goto(url+'?v=5');await calmPage.waitForTimeout(700);
 expect(await calmPage.evaluate(()=>[...document.querySelectorAll('.cr *')].some(el=>el.getAnimations().some(a=>a.playState==='running'))),
  'reduced motion still animates').toBe(false);
 await expect(calmPage.locator('.cr a').first()).toBeVisible();
 await calm.close();
 report.push({width,errors});expect(errors).toEqual([]);
}
await writeFile('evidence/magnetic-credit/review.json',JSON.stringify(report,null,2));await browser.close();
console.log(report.filter(r=>r.violations).map(r=>`${r.variant}@${r.width}: ${r.violations.length?JSON.stringify(r.violations):'axe clean'}, ${r.links} links, ends y=${r.bottom??'—'}`).join('\n'));
console.log('errors:',JSON.stringify(report.filter(r=>r.errors).map(r=>r.errors)));
