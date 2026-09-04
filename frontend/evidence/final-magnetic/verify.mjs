import {chromium} from '@playwright/test';
import {parse} from 'node-html-parser';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='evidence/final-magnetic';
const before=parse(await readFile(`${dir}/before.html`,'utf8'));
const current=parse(await(await fetch('http://127.0.0.1:3000/zh-CN/prompts')).text());
for(const s of ['.after','.nav','.foot'])assert.equal(current.querySelector(s).outerHTML,before.querySelector(s).outerHTML,s);
const browser=await chromium.launch();const measurements=[];
for(const width of [1440,698,375]){
 for(const ref of [true,false]){
  const page=await browser.newPage({viewport:{width,height:1081},colorScheme:'dark',reducedMotion:'reduce'});
  await page.goto(ref?'http://127.0.0.1:8766/final/L1-hub-magnetic.html?v=2&theme=linear-dark':'http://127.0.0.1:3000/zh-CN/prompts');
  await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
  if(ref)await page.addStyleTag({content:'.proto-picker,.theme-toggle,.argument .sig{display:none!important}'});
  const data=await page.locator('.argument').evaluate(el=>{
   const h=el.querySelector('h1'),b=el.querySelector('.body'),p=b.querySelector('p');
   const hs=getComputedStyle(h),ps=getComputedStyle(p),s=getComputedStyle(el);
   return {heading:h.textContent.trim(),copy:[...b.querySelectorAll('p')].map(p=>p.textContent.replace(/\s+/g,' ').trim()),h1:[hs.fontSize,hs.fontWeight,hs.lineHeight,h.getBoundingClientRect().width,h.getBoundingClientRect().height],body:[b.getBoundingClientRect().width,b.getBoundingClientRect().height,ps.fontSize,ps.lineHeight],padding:[s.paddingTop,s.paddingBottom]};
  });
  measurements.push({width,ref,data});
  await page.screenshot({path:`${dir}/${ref?'reference':'homepage'}-${width}-screen1.png`});
  await page.locator('.lede').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${dir}/${ref?'reference':'homepage'}-${width}-screen2.png`});
  if(!ref){
   await page.waitForLoadState('networkidle');
   assert.deepEqual(data,measurements.at(-2).data);
   const title=page.locator('.run .t').filter({hasText:'Overhead portrait on the LA Walk of Fame'});
   await title.scrollIntoViewIfNeeded();
   await title.focus();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.keyboard.press('Enter');
   const peek=page.locator('#peek-2015726421990056336');
   await page.locator('[data-peek] #peek-2015726421990056336').waitFor({state:'visible'});
   assert.ok(await peek.locator('.prompt-placeholder').count()>0);
   assert.equal(await peek.locator('.acts a').textContent(),'Generate image');
   await page.screenshot({path:`${dir}/preserved-peek-${width}.png`});
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.close();
 }
}
await browser.close();
await writeFile(`${dir}/measurements.json`,JSON.stringify({unchanged:['.after (including peek markup and Browse)','.nav','.foot'],measurements},null,2));
console.log('Reference first-screen text and geometry match at 1440/698/375px. Second screen, peek, Browse, nav and footer markup unchanged.');
