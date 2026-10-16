import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const locale of ['zh-CN','en']){
 test(`${locale} four levels, filters and five footer columns`,async({page})=>{
  const zh=locale==='zh-CN',hub=`/${locale}/prompts`;
  await page.goto(hub);
  await expect(page.locator('#monetization [data-monetization-group]')).toHaveCount(8);
  await page.locator(`#monetization a[href="${hub}/monetization/commerce"]`).click();
  await expect(page.locator('h1')).toHaveText(zh?'电商带货':'E-commerce content');
  await page.locator(`a[href="${hub}/monetization/commerce/womenswear-selling"]`).first().click();
  await expect(page.locator('h1')).toHaveText(zh?'AI 女装带货':'AI womenswear content');
  await expect(page.locator('[data-monetization-case]').first()).toBeVisible();
  const selects=page.locator('.monet-filters select');
  await selects.nth(2).selectOption('direct');await expect(page).toHaveURL(/fit=direct/);
  const selected=await page.locator('[data-monetization-case]').count();expect(selected).toBeGreaterThan(0);
  await page.reload();await expect(selects.nth(2)).toHaveValue('direct');
  const detail=page.locator('[data-monetization-case] h2 a').first();const href=await detail.getAttribute('href');
  await detail.click();await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('.monet-related')).toBeVisible();
  const text=await page.locator('[data-prompt]').textContent();const generation=page.locator('[data-generation-cta]').first();
  await expect.poll(async()=>new URL((await generation.getAttribute('href'))!).searchParams.get('prompts')).toBe(text);
  await page.goBack();await expect(selects.nth(2)).toHaveValue('direct');
  await page.getByRole('button',{name:zh?'清除筛选':'Clear filters',exact:true}).click();await expect(page).not.toHaveURL(/fit=/);
  await expect(page.locator('.footnav > div')).toHaveCount(5);await expect(page.locator('.footnav > div').last().locator('a')).toHaveCount(6);
  const other=zh?'en':'zh-CN';await page.locator('.language-switch summary').click();await page.locator(`.language-switch a[hreflang="${other}"]`).click();await expect(page).toHaveURL(new RegExp(`/${other}/prompts/monetization/commerce/womenswear-selling$`));
  for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.filter(v=>['critical','serious'].includes(v.impact??''))).toEqual([]);
 });
 test(`${locale} adaptable cases and website scenes retain source navigation`,async({page})=>{
  await page.goto(`/${locale}/prompts/monetization/creator-content/wechat-covers?fit=adaptable`);
  await expect(page.locator('.monet-filters select').nth(2)).toHaveValue('adaptable');await expect(page.locator('.monet-note').first()).toBeVisible();
  await page.goto(`/${locale}/prompts/monetization/web-services/ecommerce-websites`);
  const href=await page.locator('[data-monetization-case] h2 a').first().getAttribute('href');
  expect(href).toMatch(/\/(?:website\/|case-)/);await page.locator('[data-monetization-case] h2 a').first().click();await expect(page.locator('.monet-related')).toBeVisible();
  expect(await page.locator('a[target="_blank"][rel*="nofollow"]').count()).toBeGreaterThan(0);
 });
 test(`${locale} no-JavaScript directory and unknown parent routes`,async({browser,baseURL})=>{
  const context=await browser.newContext({javaScriptEnabled:false,baseURL});const page=await context.newPage();
  await page.goto(`/${locale}/prompts/monetization`);await expect(page.locator('h1')).toBeVisible();
  await page.locator(`a[href="/${locale}/prompts/monetization/commerce"]`).first().click();
  await page.locator(`a[href="/${locale}/prompts/monetization/commerce/womenswear-selling"]`).first().click();
  await page.locator('[data-monetization-case] h2 a').first().click();await expect(page.locator('[data-prompt]')).toBeVisible();
  const response=await page.goto(`/${locale}/prompts/monetization/wrong/womenswear-selling`);expect(response?.status()).toBe(404);await context.close();
 });
}
