import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const names=['Counterpoint','Initials','Label','Ghost','Dropcap'];
const REAL={'Vincent Wu':'https://x.com/VincentWu11','Steve Li':'https://x.com/st3v3li'};
const url='http://127.0.0.1:8766/proto-l1-credit-scale.html';
/* One normalizer, used at both capture sites — the round-two script had it at only one of them,
   which compared a normalized string against an un-normalized one and read as a real failure.
   Inline's own leading space belongs to the credit, so whitespace runs collapse; anything
   structural above it still differs loudly. */
const stripCredit = page => page.evaluate(() => {
  const a = document.querySelector('.argument').cloneNode(true);
  a.querySelectorAll('.cr').forEach(el => el.remove());
  /* Whitespace-insensitive on both sides: Inline leaves a space inside the signature line where a
     block direction leaves none, and that space is part of the credit, not of the screen above it.
     Any structural or textual difference still shows. */
  return a.outerHTML.replace(/\s+/g, ' ').replace(/\s+</g, '<').replace(/>\s+/g, '>');
});
const browser=await chromium.launch();await mkdir('evidence/credit-scale',{recursive:true});const report=[];
for(const width of [1440,375]){
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,160))});
 await page.goto(url);await page.waitForTimeout(500);
 // Baseline: the whole first screen with the credit removed. Nothing else may differ.
 const baseline=await stripCredit(page);
 for(let v=0;v<names.length;v++){
  await page.getByRole('button',{name:names[v],exact:true}).click();
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1100);
  // The motion decision is not up for grabs here: every direction is the Magnetic master.
  expect(await page.evaluate(()=>document.querySelector('#stage > *').dataset.field),'not the Magnetic master').toBe('magnet');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow,names[v]).toBe(false);
  await page.screenshot({path:`evidence/credit-scale/${v+1}-${names[v].toLowerCase()}-${width}.png`});
  // The master ships light and carries its own theme toggle; §7 makes production default to
  // Linear dark, so every direction is looked at in both.
  await page.locator('#theme-toggle').click();await page.waitForTimeout(500);
  await page.screenshot({path:`evidence/credit-scale/${v+1}-${names[v].toLowerCase()}-${width}-dark.png`});
  const darkAxe=await new AxeBuilder({page}).include('.argument').analyze();
  expect(darkAxe.violations.filter(x=>x.nodes.some(n=>String(n.target).includes('cr'))),'the credit fails contrast in dark').toEqual([]);
  await page.locator('#theme-toggle').click();await page.waitForTimeout(300);
  const same=await stripCredit(page);
  expect(same,`${names[v]} changed the first screen above the credit`).toBe(baseline);
  const links=await page.locator('.cr a').evaluateAll(l=>l.map(a=>({href:a.getAttribute('href'),rel:a.getAttribute('rel'),target:a.getAttribute('target'),expand:a.hasAttribute('data-expand')})));
  {
   expect(links.length).toBe(2);
   for(const link of links){
    expect(Object.values(REAL)).toContain(link.href);
    expect(link.rel).toContain('noopener');expect(link.target).toBe('_blank');
    // A credit name must never be mistaken for a title: the peek disclosure keys off [data-expand].
    expect(link.expand).toBe(false);
   }
  }
  /* The round's own premise: the names stay small, and anything set large is either part of a
     name (Dropcap's capital, Initials' monogram) or decoration hidden from assistive tech. A big
     element that is neither would be an ornament shouting over the credit. */
  const oversized=await page.locator('.cr *').evaluateAll(l=>l
    .filter(el=>parseFloat(getComputedStyle(el).fontSize)>17)
    /* Only elements that actually SET type on screen: a container that merely passes its size
       down to a link is not the thing being judged. */
    .filter(el=>[...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim()))
    /* Inside a link means it is part of a name; inside anything aria-hidden means it is
       decoration the credit does not depend on. Ancestors count, not just the element. */
    .filter(el=>!el.closest('a') && !el.closest('[aria-hidden="true"]'))
    .map(el=>el.className+':'+getComputedStyle(el).fontSize));
  expect(oversized,'something large is neither part of a name nor marked decorative').toEqual([]);
  const nameSize=await page.locator('.cr a').first().evaluate(el=>{
    const t=[...el.querySelectorAll('*')].find(n=>n.className!=='vh'&&!n.querySelector('*'))||el;
    return parseFloat(getComputedStyle(t).fontSize)});
  expect(nameSize,'the name text is not small').toBeLessThanOrEqual(35);
  /* Every link still announces a whole name, never a monogram or a beheaded word. */
  const namesRead=await page.locator('.cr a').evaluateAll(l=>l.map(a=>a.textContent.replace(/\s+/g,' ').trim()));
  for(const read of namesRead) expect(['Vincent Wu','Steve Li'].some(n=>read.startsWith(n)),
    'a link does not begin with a whole name: '+read).toBe(true);
  const axe=await new AxeBuilder({page}).include('#stage').analyze();
  const bottom=await page.evaluate(()=>Math.round(document.querySelector('.cr').getBoundingClientRect().bottom+scrollY));
  report.push({variant:names[v],width,overflow,bottom,links:links.length,
   violations:axe.violations.map(x=>({id:x.id,impact:x.impact,targets:x.nodes.map(n=>n.target)}))});
 }
 // Replay re-runs the entrance; it exists because four of the five have one.
 await page.getByRole('button',{name:'Dropcap',exact:true}).click();await page.waitForTimeout(900);
 await page.getByRole('button',{name:'Replay animation (R)'}).click();await page.waitForTimeout(80);
 expect(await page.evaluate(()=>[...document.querySelectorAll('.cr *')].some(el=>el.getAnimations().some(a=>a.playState==='running'))),
  'replay did not re-run the entrance').toBe(true);
 await expect(page).toHaveURL(/\?v=5$/);
 await page.reload();await page.waitForTimeout(400);
 await expect(page.getByRole('button',{name:'Dropcap',exact:true})).toHaveAttribute('aria-current','true');
 await context.close();
 const calm=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 const calmPage=await calm.newPage();
 await calmPage.goto(url+'?v=2');await calmPage.waitForTimeout(700);
 expect(await calmPage.evaluate(()=>[...document.querySelectorAll('.cr *')].some(el=>el.getAnimations().some(a=>a.playState==='running'))),
  'reduced motion still animates').toBe(false);
 await expect(calmPage.locator('.cr a').first()).toBeVisible();
 await calmPage.goto(url+'?v=3');await calmPage.waitForTimeout(400);
 expect(await calmPage.evaluate(()=>getComputedStyle(document.querySelector('.cr-word')).clipPath),
  'Label stays clipped when motion is off').toBe('none');
 await calm.close();
 report.push({width,errors});expect(errors).toEqual([]);
}
await writeFile('evidence/credit-scale/review.json',JSON.stringify(report,null,2));await browser.close();
console.log(report.filter(r=>r.violations).map(r=>`${r.variant}@${r.width}: ${r.violations.length?JSON.stringify(r.violations):'axe clean'}, ${r.links} links, ends y=${r.bottom??'—'}`).join('\n'));
console.log('errors:',JSON.stringify(report.filter(r=>r.errors).map(r=>r.errors)));
