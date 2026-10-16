import {test,expect} from '@playwright/test';
for(const locale of ['zh-CN','en'])test(`${locale} knowledge product reference survives model filter and opens seven-page detail`,async({page})=>{
 const id='study-periciacards-7603866348644519190',slug='study-periciacards-digital-detox-carousel';
 await page.goto(`/${locale}/prompts/monetization/digital-products?model=gpt-image-2#tasks`);
 const plate=page.locator(`[data-monetization-case="${id}"]`);
 await expect(plate).toBeVisible();await expect(plate.locator('.cap')).toContainText(locale==='en'?'Reproduction model':'复现模型');
 await expect(plate.locator('.monet-note')).toContainText(locale==='en'?'does not establish sales':'不能证明销售');
 await plate.locator('h3 a').click();await expect(page).toHaveURL(new RegExp(`${slug}$`));
 const images=page.locator('img[src*="/reference-studies/"]');await expect(images).toHaveCount(7);
 for(const img of await images.all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBe(1440);}
 await expect(page.locator('main')).toContainText(locale==='en'?'original model unknown':'原作者模型未知');
 await expect(page.locator('main')).toContainText(locale==='en'?'about 1M views':'约100万浏览');
 await expect(page.locator('a[href="https://www.tiktok.com/@periciacards/photo/7603866348644519190"]').first()).toBeVisible();
 const body=await page.locator('[data-prompt]').textContent(),href=await page.locator('[data-generation-cta]').first().getAttribute('href');
 expect(new URL(href!).origin).toBe('https://app.ancher.ai');expect(new URL(href!).searchParams.get('prompts')).toBe(body);
 await page.setViewportSize({width:375,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
