import { test, expect } from '@playwright/test';
const paths=['models/gpt-image-2','model-families/gpt-image','styles/poster','website/views/all','website/views/tool/three-js','use-cases/posters-typography','website/views/use-case/website-creation'];
test('similar page indexes start with twelve entries and can expand and collapse',async({page})=>{
 test.setTimeout(120000);
 for(const locale of ['en','zh-CN'])for(const path of paths){
  const response=await page.goto(`/${locale}/prompts/${path}`,{waitUntil:'domcontentloaded'});expect(response?.status(), page.url()).toBe(200);
  const index=page.locator('.compact-index').first(),links=index.locator('a');
  const total=await links.count();expect(total).toBeGreaterThan(12);
  await expect(index.locator('.index-preview a')).toHaveCount(12);
  await expect(index.locator('a:visible')).toHaveCount(12);
  const summary=index.locator('summary');await summary.focus();await summary.press('Enter');
  await expect(index.locator('a:visible')).toHaveCount(total);
  const href=await links.last().getAttribute('href');
  if(href?.startsWith('#'))await expect(page.locator(`[id="${href.slice(1)}"]`)).toHaveCount(1);
  await summary.press('Enter');await expect(index.locator('a:visible')).toHaveCount(12);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});
test('the full index remains accessible without JavaScript',async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 for(const locale of ['en','zh-CN']){
  await page.goto(`${baseURL}/${locale}/prompts/models/gpt-image-2`,{waitUntil:'domcontentloaded'});
  const index=page.locator('.compact-index'),total=await index.locator('a').count();
  await expect(index.locator('a:visible')).toHaveCount(12);
  await index.locator('summary').click();await expect(index.locator('a:visible')).toHaveCount(total);
 }
 await context.close();
});
