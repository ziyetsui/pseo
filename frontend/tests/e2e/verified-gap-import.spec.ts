import {test,expect} from '@playwright/test';
test('new source-backed templates work in both languages and preserve the generation URL',async({page},info)=>{
 for(const locale of ['en','zh-CN']){
  await page.goto(`/${locale}/prompts/website/websitecase_02d86f2fa113eb9997f84e003cc46976`,{waitUntil:'domcontentloaded'});
  const body=page.locator('[data-prompt]');await expect(body).toContainText('[PROJECT_TYPE]');
  await expect(page.getByRole('radiogroup')).toHaveCount(1);
  await page.getByRole('radiogroup').getByRole('radio',{name:locale==='en'?'Custom':'自定义',exact:true}).check();
  await page.getByRole('textbox',{name:'[PROJECT_TYPE]',exact:true}).fill('3D ceramic collection');
  await expect(body).toContainText('3D ceramic collection');
  const url=new URL((await page.locator('[data-generation-cta]').getAttribute('href'))!);
  expect(url.origin).toBe('https://app.ancher.ai');expect(url.searchParams.get('prompts')).toBe(await body.textContent());
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath(`${locale}-hanfu-import.png`),animations:'disabled'});
  await page.goto(`/${locale}/prompts/case-0863daa8f94f827ef322d4f5c2f53f65`,{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-prompt]')).toContainText('[TARGET_AUDIENCE]');
  await expect(page.getByRole('radiogroup')).toHaveCount(4);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content',/noindex/);
 }
});
test('recovered video loads and plays without changing prompt attribution',async({page},info)=>{
 await page.goto('/en/prompts/case-7dd3d40264159ae96b96e5610d2f6f6b',{waitUntil:'domcontentloaded'});
 await expect(page.locator('meta[name=referrer]')).toHaveAttribute('content','no-referrer');
 const video=page.locator('.shots video').first();await expect(video).toHaveAttribute('src',/^(https:\/\/video\.twimg\.com\/|\/website-videos\/)/);
 await expect(video).toHaveAttribute('controls','');
 await video.evaluate(async node=>{const v=node as HTMLVideoElement;v.muted=true;await v.play();});
 await expect.poll(()=>video.evaluate(node=>(node as HTMLVideoElement).currentTime),{timeout:20000}).toBeGreaterThan(0);
 expect(await video.evaluate(node=>(node as HTMLVideoElement).videoWidth)).toBeGreaterThan(0);
 await expect(page.locator('a[href="https://x.com/aichrislee/status/2104240995613266119"]').first()).toBeVisible();
 await page.screenshot({path:info.outputPath('coffee-source-video.png'),animations:'disabled'});
 await video.evaluate(node=>(node as HTMLVideoElement).pause());
});
