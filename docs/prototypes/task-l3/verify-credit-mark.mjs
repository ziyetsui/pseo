import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const names=['Inline','Mono','Bracket','Stamp','Counterpoint'];
const REAL={'Vincent Wu':'https://x.com/VincentWu11','Steve Li':'https://x.com/st3v3li'};
const url='http://127.0.0.1:8766/proto-l1-credit-mark.html';
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
const browser=await chromium.launch();await mkdir('evidence/credit-mark',{recursive:true});const report=[];
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
  await page.screenshot({path:`evidence/credit-mark/${v+1}-${names[v].toLowerCase()}-${width}.png`});
  // The master ships light and carries its own theme toggle; §7 makes production default to
  // Linear dark, so every direction is looked at in both.
  await page.locator('#theme-toggle').click();await page.waitForTimeout(500);
  await page.screenshot({path:`evidence/credit-mark/${v+1}-${names[v].toLowerCase()}-${width}-dark.png`});
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
  const biggest=await page.locator('.cr a, .cr span').evaluateAll(l=>Math.max(...l.map(el=>parseFloat(getComputedStyle(el).fontSize))));
  expect(biggest,'a credit element is set larger than the round allows').toBeLessThanOrEqual(41);
  const nameSize=await page.locator('.cr a').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(nameSize,'the names are not small').toBeLessThanOrEqual(17);
  const axe=await new AxeBuilder({page}).include('#stage').analyze();
  const bottom=await page.evaluate(()=>Math.round(document.querySelector('.cr').getBoundingClientRect().bottom+scrollY));
  report.push({variant:names[v],width,overflow,bottom,links:links.length,
   violations:axe.violations.map(x=>({id:x.id,impact:x.impact,targets:x.nodes.map(n=>n.target)}))});
 }
 // Replay re-runs the entrance; it exists because four of the five have one.
 await page.getByRole('button',{name:'Counterpoint',exact:true}).click();await page.waitForTimeout(900);
 await page.getByRole('button',{name:'Replay animation (R)'}).click();await page.waitForTimeout(80);
 expect(await page.evaluate(()=>[...document.querySelectorAll('.cr *')].some(el=>el.getAnimations().some(a=>a.playState==='running'))),
  'replay did not re-run the entrance').toBe(true);
 await expect(page).toHaveURL(/\?v=5$/);
 await page.reload();await page.waitForTimeout(400);
 await expect(page.getByRole('button',{name:'Counterpoint',exact:true})).toHaveAttribute('aria-current','true');
 await context.close();
 const calm=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 const calmPage=await calm.newPage();
 await calmPage.goto(url+'?v=2');await calmPage.waitForTimeout(700);
 expect(await calmPage.evaluate(()=>[...document.querySelectorAll('.cr *')].some(el=>el.getAnimations().some(a=>a.playState==='running'))),
  'reduced motion still animates').toBe(false);
 await expect(calmPage.locator('.cr a').first()).toBeVisible();
 expect(await calmPage.evaluate(()=>getComputedStyle(document.querySelector('.cr-mono')).clipPath),
  'Mono stays clipped when motion is off').toBe('none');
 await calm.close();
 report.push({width,errors});expect(errors).toEqual([]);
}
await writeFile('evidence/credit-mark/review.json',JSON.stringify(report,null,2));await browser.close();
console.log(report.filter(r=>r.violations).map(r=>`${r.variant}@${r.width}: ${r.violations.length?JSON.stringify(r.violations):'axe clean'}, ${r.links} links, ends y=${r.bottom??'—'}`).join('\n'));
console.log('errors:',JSON.stringify(report.filter(r=>r.errors).map(r=>r.errors)));
