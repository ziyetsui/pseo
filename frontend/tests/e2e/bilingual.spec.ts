import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const recipe='prompt-portrait-photography-from-above-ana-d-2015726421990056336';
test('both languages render complete interfaces and share exact original prompt text',async({page,request})=>{
 const body:Record<string,string>={};
 for(const locale of ['zh-CN','en']){
  const chinese=locale==='zh-CN';
  await page.goto(`/${locale}/prompts`,{waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect(page.locator('body')).toHaveAttribute('lang',locale);
  await expect(page.locator('.brand')).toHaveText(chinese?'提示词库':'Prompt Library');
  await expect(page.locator('h1')).toHaveText(chinese?'这条提示词，早已有人写好':'Somebody already wrote this');
  const titles=page.locator('[data-entry] .u');
  await expect(titles).toHaveCount(36);
  await page.getByRole('button',{name:chinese?'查看更多提示词':'Show more prompts',exact:true}).click();
  await expect(titles).toHaveCount(54);
  await page.getByRole('button',{name:chinese?'收起':'Show fewer',exact:true}).click();
  await expect(titles).toHaveCount(36);
  expect(await titles.allTextContents()).toEqual(expect.arrayContaining([chinese?'洛杉矶星光大道俯拍人像':'Overhead portrait on the LA Walk of Fame']));
  if(!chinese)expect((await titles.allTextContents()).filter(title=>/[\u3400-\u9fff]/u.test(title))).toEqual([]);
  for(const [path,title] of [['website',chinese?'网站分类':'Website views'],['library-index',chinese?'提示词库目录':'Library index']] as const){
   await page.goto(`/${locale}/prompts/${path}`,{waitUntil:'domcontentloaded'});await expect(page.locator('h1')).toHaveText(title);
   await expect(page.locator('[data-language-switch]')).toHaveAttribute('href',`/${chinese?'en':'zh-CN'}/prompts/${path}`);
  }
  await page.goto(`/${locale}/prompts/${recipe}`,{waitUntil:'domcontentloaded'});
  await expect(page.locator('h1')).toHaveText(chinese?'洛杉矶星光大道俯拍人像':'Overhead portrait on the LA Walk of Fame');
  await expect(page.getByRole('heading',{name:chinese?'设置占位符':'Set the placeholders',exact:true})).toBeVisible();
  body[locale]=await page.locator('[data-prompt]').textContent()??'';
  await expect(page.locator('[data-prompt]')).toHaveAttribute('lang','en');
  const groups=page.getByRole('radiogroup');await expect(groups.first().getByRole('radio').first()).toBeEnabled();
  await groups.first().getByRole('radio').first().check();
  await expect(page.locator('[data-prompt]')).toContainText(await groups.first().getByRole('radio').first().inputValue());
 }
 expect(body.en).toBe(body['zh-CN']);
 expect((await request.get('/fr/prompts')).status()).toBe(404);
});

test('language switches preserve object, filters, fragments and back navigation',async({page})=>{
 await page.goto('/zh-CN/prompts/website/views/all#main',{waitUntil:'domcontentloaded'});
 await page.getByLabel('搜索案例').fill('Halloween pool');await page.getByRole('button',{name:'筛选',exact:true}).click();
 await expect(page.locator('[data-website-case]')).toHaveCount(1);
 await expect(page.locator('[data-language-switch]')).toHaveAttribute('href',/\/en\/prompts\/website\/views\/all\?q=Halloween\+pool/);
 await page.locator('[data-language-picker] summary').click();
 await page.locator('[data-language-switch]').click({noWaitAfter:true});
 await expect(page).toHaveURL(/\/en\/prompts\/website\/views\/all\?q=Halloween\+pool/);
 await expect(page.getByLabel('Search cases')).toHaveValue('Halloween pool');await expect(page.locator('[data-website-case]')).toHaveCount(1);
 await page.goBack({waitUntil:'domcontentloaded'});await expect(page.getByLabel('搜索案例')).toHaveValue('Halloween pool');
 await page.goto(`/en/prompts/${recipe}#recipe-text`,{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-language-switch]')).toHaveAttribute('href',`/zh-CN/prompts/${recipe}#recipe-text`);
 await page.locator('[data-language-picker] summary').click();
 await page.locator('[data-language-switch]').click({noWaitAfter:true});await expect(page).toHaveURL(new RegExp(`/zh-CN/prompts/${recipe}#recipe-text$`));
});

test('bilingual layouts fit, remain accessible and switch without JavaScript',async({page,browser},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const locale of ['zh-CN','en'])for(const path of ['image','video','website/views/use-case/website-fun','website/views/tool/three-js',recipe,'library-index']){
  await page.goto(`/${locale}/prompts/${path}`,{waitUntil:'domcontentloaded'});
  for(const width of [375,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.screenshot({path:info.outputPath(`${locale}-${path.replaceAll('/','-')}.png`)});
 }
 const context=await browser.newContext({javaScriptEnabled:false});const noJS=await context.newPage();
 await noJS.goto(`${process.env.FRONTEND_TEST_URL}/zh-CN/prompts/website/views/tool/three-js`,{waitUntil:'domcontentloaded'});
 await expect(noJS.locator('[data-language-switch]')).toHaveAttribute('href','/en/prompts/website/views/tool/three-js');
 await noJS.locator('[data-language-picker] summary').click();
 await noJS.locator('[data-language-switch]').click({noWaitAfter:true});await expect(noJS).toHaveURL(/\/en\/prompts\/website\/views\/tool\/three-js$/);
 await expect(noJS.locator('[data-website-case]')).not.toHaveCount(0);await context.close();
});

test('language choices stay inside the viewport and close with Escape',async({page},info)=>{
 for(const path of ['library-index','models/nano-banana','website/views/tool/three-js']){
 await page.goto(`/en/prompts/${path}`,{waitUntil:'networkidle'});
 const picker=page.locator('[data-language-picker]');
 await picker.locator('summary').click();
 await expect(picker.getByRole('link',{name:'中文',exact:true})).toBeVisible();
 const bounds=await picker.locator('.language-switch-options').boundingBox();
 expect(bounds).not.toBeNull();expect(bounds!.x).toBeGreaterThanOrEqual(0);
 expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
 const accessibility=await new AxeBuilder({page}).include('[data-language-picker]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 expect(accessibility.violations.map(violation=>violation.id)).toEqual([]);
 if(path==='library-index')await page.screenshot({path:info.outputPath('editorial-language-menu.png')});
 await page.keyboard.press('Escape');await expect(picker).not.toHaveAttribute('open');
 await expect(picker.locator('summary')).toBeFocused();
 }
 });
