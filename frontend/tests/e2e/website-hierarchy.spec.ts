import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Deck buttons and keyboard select one active project with bounded controls',async({page})=>{
  await page.goto('/zh-CN/prompts/website/views/all',{waitUntil:'domcontentloaded'});
  const deck=page.locator('.deck'),previous=page.getByRole('button',{name:'← Previous',exact:true}),next=page.getByRole('button',{name:'Next →',exact:true});
  await expect(next).toBeEnabled();await expect(previous).toBeDisabled();
  await expect(deck.locator('.dc:not([inert])')).toHaveCount(1);
  const first=await deck.locator('[data-top] h3').textContent();
  await next.click();await expect(page.locator('.dkpos')).toHaveText('2 of 60');
  expect(await deck.locator('[data-top] h3').textContent()).not.toBe(first);
  await deck.focus();await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.dkpos')).toHaveText('1 of 60');
  await page.keyboard.press('ArrowLeft');await expect(previous).toBeDisabled();
  await expect(page.locator('.website-title-index a')).toHaveCount(60);
  await deck.focus();
  for(let index=0;index<60;index++)await page.keyboard.press('ArrowRight');
  await expect(page.locator('.dkpos')).toHaveText('60 of 60');await expect(next).toBeDisabled();
  await expect(deck.locator('.dc:not([inert])')).toHaveCount(1);
});

test('Findings, Anthology, Recipe and index preserve graph scope and navigation',async({page,request})=>{
  await page.goto('/zh-CN/prompts/website/views/use-case/website-fun',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.prototype-task-findings .finding')).not.toHaveCount(0);
  await expect(page.locator('[data-website-case]')).toHaveCount(19);
  const contrast=await page.locator('.website-view-tabs [aria-current=page]').evaluate(el=>{const css=getComputedStyle(el);return {text:css.color,background:css.backgroundColor};});
  expect(contrast.text).not.toBe(contrast.background);
  await page.goto('/zh-CN/prompts/website/views/tool/three-js',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.model-signature')).toBeVisible();
  await expect(page.locator('.toc li')).toHaveCount(36);
  await expect(page.locator('.anth [data-website-case]')).toHaveCount(36);
  const target=await page.locator('.toc a').first().getAttribute('href');
  await page.locator('.toc a').first().click();
  await expect(page.locator(target!)).toBeInViewport();
  await page.locator('.anth a[data-case-title]').first().click();
  await expect(page.locator('.prototype-recipe .step .num')).toHaveText(['01','02','03','04']);
  await page.locator('footer a[href$="/library-index"]').click();
  await expect(page.locator('h1')).toHaveText('Library index');
  await expect(page.locator('details')).toHaveCount(4);
  const index=await(await request.get('/library-index.json')).json();
  expect(index.collections.reduce((sum:number,group:{entries:unknown[]})=>sum+group.entries.length,0)).toBe(616);
  expect(index.groups.filter((group:{id:string})=>group.id.startsWith('website-')).reduce((sum:number,group:{entries:unknown[]})=>sum+group.entries.length,0)).toBe(29);
});

test('all hierarchy compositions fit and have no WCAG violations',async({page,request},testInfo)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const index=await(await request.get('/library-index.json')).json();
  const detail=index.collections.find((group:{id:string})=>group.id==='website-details').entries.find((entry:{href:string})=>entry.href.includes('/website/')).href;
  for(const path of ['website/views/all','website/views/use-case/website-fun','website/views/tool/three-js','library-index',detail.replace('/zh-CN/prompts/','')]){
    await page.goto(`/zh-CN/prompts/${path}`,{waitUntil:'domcontentloaded'});
    for(const width of [375,768,1440]){
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    }
    if(path==='website/views/tool/three-js')expect(await page.locator('.msh-lane').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    await page.screenshot({path:testInfo.outputPath(`${path.replaceAll('/','-')}.png`)});
  }
});
