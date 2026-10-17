import {test,expect} from '@playwright/test';
import records from '../../../docs/intake/2026-10-16-portfolio/records.json' with {type:'json'};
for(const record of records)test(`portfolio ${record.sourceId} edits and plays in both locales`,async({page},info)=>{
 for(const locale of ['en','zh-CN']){
  const path=record.href.replace('/zh-CN/',`/${locale}/`);
  await page.goto(path,{waitUntil:'domcontentloaded'});
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content',/noindex/);
  await expect(page.locator('a[href="'+record.sourceUrl+'"]').first()).toBeVisible();
  const group=page.getByRole('radiogroup').first();await expect(group).toBeVisible();
  await group.getByRole('radio',{name:locale==='en'?'Custom':'自定义',exact:true}).check();
  const label=await page.locator('#'+await group.getAttribute('aria-labelledby')).textContent();
  const input=page.getByRole('textbox',{name:label!.trim(),exact:true});await input.fill('Independent portfolio value');
  const body=page.locator('[data-prompt]');await expect(body).toContainText('Independent portfolio value');
  const url=new URL((await page.locator('[data-generation-cta]').getAttribute('href'))!);
  expect(url.origin).toBe('https://app.ancher.ai');expect(url.searchParams.get('prompts')).toBe('创建一个关于的 HTML 网页\n\n'+await body.textContent());
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const videos=page.locator('.shots video');await expect(videos.first()).toHaveAttribute('src',/^\/website-videos\//);
  if(locale==='en'){
   for(const video of await videos.all()){
    await video.evaluate(async node=>{const v=node as HTMLVideoElement;v.muted=true;await v.play();});
    await expect.poll(()=>video.evaluate(node=>(node as HTMLVideoElement).currentTime),{timeout:20000}).toBeGreaterThan(0);
    expect(await video.evaluate(node=>(node as HTMLVideoElement).videoWidth)).toBeGreaterThan(0);
    await video.evaluate(node=>(node as HTMLVideoElement).pause());
   }
  }
  if(record.sourceId==='2016202580582707412'||record.sourceId==='2029146227305263600')await page.screenshot({path:info.outputPath(`${locale}-${record.sourceId}.png`),animations:'disabled'});
 }
});
for(const locale of ['en','zh-CN'])test(`catalog navigation uses complete document requests on ${locale}`,async({page})=>{
 const navigations:string[]=[],missingTransport:string[]=[];
 page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())navigations.push(request.url());});
 page.on('response',response=>{if(response.url().includes('__next.')&&response.status()>=400)missingTransport.push(response.url());});
 await page.goto(`/${locale}/prompts/case-c40f38e72fa902a647e00859ffd993f3`);
 await page.locator(`a[href="/${locale}/prompts/models/kimi"]`).first().click();
 await expect(page).toHaveURL(new RegExp(`/${locale}/prompts/models/kimi$`));
 await page.getByRole('contentinfo').locator(`a[href="/${locale}/prompts/website"]`).first().click();
 await expect(page).toHaveURL(new RegExp(`/${locale}/prompts/website$`));
 expect(navigations).toHaveLength(3);expect(missingTransport).toEqual([]);
});
