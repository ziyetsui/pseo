import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const path='/zh-CN/prompts/styles/photorealistic';

test('style cards open Plate with real scoped records, index, and L4 actions',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/zh-CN/prompts');await page.locator('#styles a.tile').filter({hasText:'Photorealistic'}).click();
 await expect(page).toHaveURL(new RegExp(`${path}$`));await expect(page.locator('h1')).toContainText('Photorealistic');
 await expect(page.locator('.ctrl [role="status"]')).toHaveText('27 of 27 Photorealistic prompts');
 await expect(page.locator('.plates .plate')).toHaveCount(27);await expect(page.locator('.lop a')).toHaveCount(27);
 const target=await page.locator('.lop a').nth(2).getAttribute('href');await page.locator('.lop a').nth(2).click();
 await expect(page.locator(target!)).toBeInViewport();await expect(page.locator(`${target} .fig`)).toContainText('03');
 const title=await page.locator(`${target} h3`).innerText();await page.locator(`${target} .rr .pri`).click();
 await expect(page.locator('.prototype-recipe h1')).toHaveText(title);await page.goBack();
 // Wait for the restored Plate document before issuing a new navigation command.
 await expect(page.locator('.prototype-style-plate')).toBeVisible();await page.reload();
 await expect(page.locator('.prototype-style-plate')).toBeVisible();await expect(page.locator('.proto-picker,iframe')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/copy prompt/i})).toHaveCount(0);expect(errors).toEqual([]);
});

test('style filters restore history and cannot escape the current style',async({page})=>{
 await page.goto(path);const chip=page.locator('.scroller button').first();
 await chip.click();await expect(chip).toHaveAttribute('aria-pressed','true');await expect(page).toHaveURL(/model=/);
 const filtered=await page.locator('.plate').count();expect(filtered).toBeGreaterThan(0);expect(filtered).toBeLessThan(27);
 await page.reload();await expect(chip).toHaveAttribute('aria-pressed','true');await expect(page.locator('.plate')).toHaveCount(filtered);
 await page.locator('.scroller button').nth(1).click();await page.goBack();await expect(page.locator('.plate')).toHaveCount(filtered);
 await page.getByRole('searchbox').fill('zz-no-match');await expect(page.locator('.empty')).toBeVisible();
 await page.locator('.empty button').click();await expect(page.locator('.plate')).toHaveCount(27);
 await page.goto(`${path}?style=missing-style`);await expect(page.locator('.empty')).toBeVisible();
 await page.locator('.empty button').click();await expect(page.locator('.plate')).toHaveCount(27);
 await page.goto('/zh-CN/prompts/use-cases/beauty');await expect(page.locator('.prototype-task-findings')).toBeVisible();
 await page.goto('/zh-CN/prompts/models/nano-banana-pro');await expect(page.locator('.prototype-anthology')).toBeVisible();
 await page.goto('/zh-CN/prompts?style=photorealistic');await expect(page.locator('.prototype-style-plate')).toHaveCount(0);
 expect((await page.goto('/zh-CN/prompts/styles/missing-style'))?.status()).toBe(404);
});

test('Plate adapts to mobile, retains media, and renders without JavaScript',async({page,browser},info)=>{
 await page.goto(path);await page.evaluate(()=>document.fonts.ready);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
 expect(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
 await page.screenshot({path:`evidence/style-plate/implementation-${info.project.name}.png`});
 await page.locator('.plate').first().evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
 await page.waitForFunction(()=>{const i=document.querySelector('.plate img');return !i||i instanceof HTMLImageElement&&i.complete});
 await expect(page.locator('.plate img').first()).toHaveCSS('object-fit','contain');
 await page.screenshot({path:`evidence/style-plate/plate-${info.project.name}.png`});
 await page.getByRole('searchbox').focus();await page.keyboard.type('zz-no-match');await expect(page.locator('.empty')).toBeVisible();
 const context=await browser.newContext({javaScriptEnabled:false});const noJS=await context.newPage();
 expect((await noJS.goto(`${process.env.FRONTEND_TEST_URL??'http://127.0.0.1:3000'}${path}`))?.status()).toBe(200);
 await expect(noJS.locator('.plate')).toHaveCount(27);await expect(noJS.locator('.wall').first()).not.toBeEmpty();await expect(noJS.locator('.lop a')).toHaveCount(27);await context.close();
});

test('Plate narrow/tablet widths and media failure remain usable',async({page},info)=>{
 test.skip(info.project.name!=='desktop','Viewport matrix runs once');
 await page.route('https://pbs.twimg.com/**',r=>r.abort());
 for(const width of [320,360,768,1024]){await page.setViewportSize({width,height:900});await page.goto('/zh-CN/prompts/styles/cinematic');await expect(page.locator('.plate')).toHaveCount(12);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
 await page.locator('.plate').first().scrollIntoViewIfNeeded();await expect(page.locator('.plate .media-fallback').first()).toBeVisible();
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.scroller button').first().focus();await page.keyboard.press('Enter');await expect(page.locator('.scroller button').first()).toHaveAttribute('aria-pressed','true');
});
