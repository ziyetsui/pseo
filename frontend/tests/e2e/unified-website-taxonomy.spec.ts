import {test,expect} from '@playwright/test';
test('one Website task entry opens three complete categories and legacy routes redirect',async({page},info)=>{
 for(const locale of ['zh-CN','en']){
  await page.goto(`/${locale}/prompts`,{waitUntil:'domcontentloaded'});
  const task=page.locator(`#tasks a.tile[href="/${locale}/prompts/website"]`);
  await expect(task).toHaveCount(1);
  await expect(task.locator('h3')).toHaveText(locale==='zh-CN'?'网站与开发':'Web design & development');
  await expect(task.locator('p')).toHaveText(locale==='zh-CN'?'224 个案例':'224 cases');
  await expect(page.locator('#tasks .browse-spotlight')).toHaveCount(0);
  await page.locator('#tasks').scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath(`${locale}-unified-task.png`),animations:'disabled'});
  await task.click();
  await expect(page.locator('[data-view-axis="use-case"]')).toHaveCount(3);
  await page.locator('[data-view-axis="use-case"][href$="/app-development"]').click();
  await expect(page.locator('[data-website-case]')).toHaveCount(19);
  await expect(page.locator('select[name="purpose"] option')).toHaveText(locale==='zh-CN'?['全部用途','应用开发']:['All purposes','Application development']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  for(const alias of ['use-cases/website-creation','use-cases/website','website/views/use-case/website-fun','website/views/use-case/web-motion-design']){
   await page.goto(`/${locale}/prompts/${alias}`,{waitUntil:'domcontentloaded'});
   await expect(page).toHaveURL(new RegExp(`/${locale}/prompts/website$`));
   await expect(page.locator('h1')).toHaveText(locale==='zh-CN'?'网站与开发':'Web design & development');
  }
 }
});
