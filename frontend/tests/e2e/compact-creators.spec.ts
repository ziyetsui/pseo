import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('creator sections show eight initially and expand and collapse with the keyboard',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const locale of ['en','zh-CN'])for(const path of ['','/models/gpt-image-2','/use-cases/photography-realism']){
  await page.goto(`/${locale}/prompts${path}`,{waitUntil:'domcontentloaded'});
  const section=page.locator('#creators'),more=section.locator('details.creator-more'),summary=more.locator('summary');
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator('a.person:visible,a.creator:visible')).toHaveCount(8);
  await expect(more).not.toHaveAttribute('open');
  await expect(summary).toContainText(locale==='en'?'View all':'查看全部');
  await summary.focus();await summary.press('Space');await expect(more).toHaveAttribute('open','');
  expect(await section.locator('a.person:visible,a.creator:visible').count()).toBeGreaterThan(8);
  await summary.press('Enter');await expect(more).not.toHaveAttribute('open');
  await expect(section.locator('a.person:visible,a.creator:visible')).toHaveCount(8);
  const results=await new AxeBuilder({page}).include('#creators').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations.map(v=>v.id)).toEqual([]);
  await page.screenshot({path:info.outputPath(`${locale}-${path?'model':'home'}-creators.png`)});
 }
});
test('the complete creator list remains available without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false}),page=await context.newPage();
 await page.goto(`${process.env.FRONTEND_TEST_URL}/en/prompts`,{waitUntil:'domcontentloaded'});
 const section=page.locator('#creators'),more=section.locator('details.creator-more');
 await expect(section.locator('a.person:visible')).toHaveCount(8);
 await more.locator('summary').click();expect(await section.locator('a.person:visible').count()).toBeGreaterThan(8);
 await more.locator('summary').click();await expect(section.locator('a.person:visible')).toHaveCount(8);await context.close();
});
