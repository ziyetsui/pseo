import {test,expect} from '@playwright/test';
const slug='queenie-1-mac-mini-1-agent-0-employees-this-is-how-you-build-the-fir-zxzsys';
const original='https://x.com/MyWestLord/status/2063321372789465409';
for(const locale of ['en','zh-CN'] as const)test(`original X attribution on ${locale} card and detail`,async({page})=>{
 await page.goto(`/${locale}/prompts/image`,{waitUntil:'domcontentloaded'});
 await page.locator('#q').fill('1 Mac Mini');
 const card=page.locator('.dc[data-top]');
 await expect(card).toContainText('@MyWestLord');
 await expect(card.locator(`a[href="${original}"]`)).toBeAttached();
 await expect(card.locator('a[href*="youmind.com"]')).toHaveCount(0);
 await card.locator('h3 a').click();
 await page.waitForURL(`**/${locale}/prompts/${slug}`);
 await expect(page.locator('main')).toContainText('@MyWestLord');
 await expect(page.locator(`main a[href="${original}"]`).first()).toBeAttached();
 await expect(page.locator('main a[href*="youmind.com"]')).toHaveCount(0);
});
