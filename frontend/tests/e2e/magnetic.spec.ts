import { test, expect } from '@playwright/test';

test('Magnetic peek preserves layout, keyboard access and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh-CN/prompts');
  const field = page.locator('.run'), first = field.locator('[data-expand]').first();
  await first.scrollIntoViewIfNeeded();
  const before = await field.boundingBox();
  await first.focus(); await page.keyboard.press('Enter');
  const panel = page.locator('[data-peek] .exp');
  await expect(panel).toBeVisible();
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  expect(await field.boundingBox()).toEqual(before);
  const bounds = await panel.boundingBox(), viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(11);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width - 11);
  await page.keyboard.press('Tab');
  await expect(panel.locator('a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(first).toBeFocused();
  await expect(first).toHaveAttribute('data-inked', '');
  await expect(first).toHaveCSS('transform', 'none');
  await expect(page.getByRole('button', { name: /copy/i })).toHaveCount(0);
});

test('Ocean current pins a hovered title while neighbours and streamlines keep flowing', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Fine-pointer vortex; touch and reduced motion have separate coverage.');
  for(const locale of ['zh-CN','en']) {
    await page.goto(`/${locale}/prompts`);
    await page.evaluate(()=>document.fonts.ready);
    const box = page.locator('.runbox');
    await box.scrollIntoViewIfNeeded();
    await expect(box).toHaveAttribute('data-current','');
    await expect(box).not.toHaveAttribute('data-depth','');
    const index=await page.locator('.run [data-expand]').evaluateAll(nodes=>nodes.findIndex(node=>{
      const r=node.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
      return r.x>=0&&r.right<=innerWidth&&y>100&&y<innerHeight-50&&document.elementFromPoint(x,y)?.closest('[data-expand]')===node;
    }));
    expect(index).toBeGreaterThanOrEqual(0);
    const target=page.locator('.run [data-expand]').nth(index);
    const targetBounds=await target.boundingBox();
    await page.mouse.move(targetBounds!.x+targetBounds!.width/2,targetBounds!.y+targetBounds!.height/2);
    await expect(target).toHaveAttribute('data-held','');
    const before=await target.evaluate(el=>(el as HTMLElement).style.transform);
    const others=await page.locator('.run [data-expand]:not([data-held])').evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).style.transform));
    await page.waitForTimeout(400);
    expect(await target.evaluate(el=>(el as HTMLElement).style.transform)).toBe(before);
    expect(await page.locator('.run [data-expand]:not([data-held])').evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).style.transform))).not.toEqual(others);
    expect(await page.locator('canvas.current-streamlines').evaluate(node=>{
      const canvas=node as HTMLCanvasElement,bytes=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
      for(let i=3;i<bytes.length;i+=4)if((bytes[i]??0)>0)return true;return false;
    })).toBe(true);
    await target.click();
    const panel=page.locator('[data-peek] .exp');await expect(panel).toBeVisible();
    const bounds=await panel.boundingBox();
    await page.mouse.move(bounds!.x+10,bounds!.y+10);await page.waitForTimeout(300);
    expect(await panel.boundingBox()).toEqual(bounds);
    await expect(panel.getByRole('link',{name:/^Generate|^生成/})).toHaveAttribute('target','_blank');
    await page.keyboard.press('Escape');await expect(target).toBeFocused();
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect(box).not.toHaveAttribute('data-current','');
    await expect(page.locator('canvas.current-streamlines')).toBeHidden();
    await expect(target).toHaveCSS('transform','none');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const paused=await page.locator('.run [data-expand]').evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).style.transform));
    await page.waitForTimeout(300);
    expect(await page.locator('.run [data-expand]').evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).style.transform))).toEqual(paused);
  }
});

 test('Ocean current supports touch previews, pagination and query remounts',async({page,isMobile})=>{
  test.skip(!isMobile,'Touch input coverage.');
  for(const locale of ['zh-CN','en']){
   await page.goto(`/${locale}/prompts`);await page.evaluate(()=>document.fonts.ready);
   const box=page.locator('.runbox');await box.scrollIntoViewIfNeeded();await expect(box).toHaveAttribute('data-current','');
   const point=await page.locator('.run [data-expand]').evaluateAll(nodes=>{
    for(const node of nodes){const r=node.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(r.x>=0&&r.right<=innerWidth&&y>100&&y<innerHeight-50&&document.elementFromPoint(x,y)?.closest('[data-expand]')===node)return {x,y};}return null;
   });expect(point).not.toBeNull();await page.touchscreen.tap(point!.x,point!.y);
   await expect(page.locator('[data-peek] .exp')).toBeVisible();
   await expect(page.locator('[data-peek] [data-expand]')).toHaveAttribute('data-held','');
   await page.getByRole('button',{name:locale==='zh-CN'?'查看更多提示词':'Show more prompts',exact:true}).click();
   await expect(page.locator('.run [data-expand]')).toHaveCount(72);
   await expect(page.locator('[data-peek]')).toHaveCount(0);
   await page.getByRole('searchbox').fill('zzzx-current-no-match');await expect(page.locator('.empty')).toBeVisible();
   await page.getByRole('searchbox').fill('');await expect(page.locator('.run [data-expand]')).toHaveCount(54);
   await expect(page.locator('.runbox')).toHaveAttribute('data-current','');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
 });
