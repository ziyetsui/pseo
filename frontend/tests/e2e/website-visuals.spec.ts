import {test,expect} from '@playwright/test';
import visuals from '../../src/data/website-visuals.json';
const minecraft='prm_052f8b966b50591e744d11476eecafe6';
const sequence=visuals.records.find(row=>row.media.length===6&&row.media.every(id=>visuals.assets[id as keyof typeof visuals.assets]!.part!==null))!;
for(const locale of ['en','zh-CN'] as const){
 test(`restored website video loads on ${locale}`,async({page,request})=>{
  await page.goto(`/${locale}/prompts/case-${minecraft.slice(4)}`,{waitUntil:'domcontentloaded'});
  const video=page.locator('main video').first();await expect(video).toHaveAttribute('controls','');
  const src=await video.getAttribute('src'),poster=await video.getAttribute('poster');expect(src).toMatch(/^\/website-videos\/\d+\.mp4$/);expect(poster).toMatch(/^\/website-previews\/\d+\.jpg$/);
  expect((await request.get(poster!)).status()).toBe(200);
  await video.evaluate(node=>{const video=node as HTMLVideoElement;video.preload='metadata';video.load();});
  await expect.poll(()=>video.evaluate(node=>(node as HTMLVideoElement).videoWidth),{timeout:30000}).toBeGreaterThan(0);
  await expect(page.locator('main a[href="https://x.com/painn_x/status/2108232717900841089"]').first()).toBeAttached();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
 test(`all complete video parts remain reachable on ${locale}`,async({page})=>{
  await page.goto(`/${locale}/prompts/case-${sequence.id.slice(4)}`,{waitUntil:'domcontentloaded'});
  await expect(page.locator('main video')).toHaveCount(6);
  for(let i=0;i<6;i++)await expect(page.locator('main video').nth(i)).toHaveAttribute('aria-label',new RegExp(locale==='en'?`Part ${i+1} of 6`:`第 ${i+1} / 6 段`));
 });
}
