import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('published Git beta exposes real image and Website counts, sources and project pages', async ({ page, request }) => {
  const response = await request.get('/frontend-build.json');
  const receipt = await response.json();
  expect(receipt.mode).toBe('git-beta');
  expect(receipt.gitBeta.importedImageRecords).toBe(541);
  expect(receipt.gitBeta.importedImageExamples).toBe(541);
  expect(receipt.gitBeta.importedWebsites).toBe(59);
  await page.goto('/zh-CN/prompts#category');
  await expect(page.locator('#category a.tile').filter({hasText:'Images'}).locator('p')).toHaveText('543 prompts');
  await expect(page.locator('#category a.tile').filter({hasText:'Website'}).locator('p')).toHaveText('60 cases');
  await page.locator('#category a.tile').filter({hasText:'Website'}).click();
  await expect(page.locator('h1')).toHaveText('Website views');
  await expect(page.locator('[data-website-case]')).toHaveCount(0);
  await expect(page.locator('[data-website-view]')).toHaveCount(30);
  await page.locator('[data-website-view][data-view-axis=all]').click();
  await expect(page.locator('h1')).toHaveText('All website cases');
  await expect(page.locator('[data-website-case]')).toHaveCount(60);
  await page.locator('[data-website-case]').nth(1).locator('h2 a').click();
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('a').filter({hasText:'View original source'})).toHaveAttribute('href', /^https:\/\/x.com\//);
  await expect(page.getByText('No prompt was included', {exact:false})).toBeVisible();
  expect((await request.get('/zh-CN/prompts/website/not-a-real-case')).status()).toBe(404);
});

test('Website search and model filters survive reload and browser history', async ({ page }) => {
  await page.goto('/zh-CN/prompts/website/views/all');
  await page.getByLabel('Search cases').fill('Halloween pool');
  await page.getByRole('button', {name:'Filter',exact:true}).click();
  await expect(page.locator('[role="status"]')).toHaveText('1 of 60 website cases');
  await expect(page).toHaveURL(/q=Halloween\+pool/);
  await expect(page.getByRole('button', {name:'Filter',exact:true})).toBeFocused();
  await page.reload();
  await expect(page.locator('[role="status"]')).toHaveText('1 of 60 website cases');
  await page.goBack();
  await expect(page.locator('[role="status"]')).toHaveText('60 of 60 website cases');
  await page.getByRole('combobox', {name:'Model',exact:true}).selectOption('claude');
  await page.getByRole('button', {name:'Filter',exact:true}).click();
  await expect(page).toHaveURL(/model=claude/);
  await expect(page.locator('[role="status"]')).not.toHaveText('60 of 60 website cases');
  await page.getByLabel('Search cases').fill('no-real-case-can-match-this');
  await page.getByRole('button', {name:'Filter',exact:true}).click();
  await expect(page.getByRole('heading',{name:'No website case matches those filters.'})).toBeVisible();
  await page.getByRole('link',{name:'Browse all cases',exact:true}).click();
  await expect(page.locator('[data-website-case]')).toHaveCount(60);
});

test('case collection remains accessible, responsive and readable without JavaScript', async ({ page, browser }, testInfo) => {
  await page.goto('/zh-CN/prompts/website');
  const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  for (const width of [375,768,1440]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`git-beta-website-${width}.png`)});
  }
  const context = await browser.newContext({javaScriptEnabled:false});
  const noJS = await context.newPage();
  await noJS.goto(`${process.env.FRONTEND_TEST_URL}/zh-CN/prompts/website`, {waitUntil:'domcontentloaded'});
  await expect(noJS.locator('[data-website-case]')).toHaveCount(0);
  await expect(noJS.locator('[data-website-view]')).toHaveCount(30);
  await expect(noJS.locator('h1')).toHaveText('Website views');
  await noJS.goto(`${process.env.FRONTEND_TEST_URL}/zh-CN/prompts/website/views/tool/three-js`, {waitUntil:'domcontentloaded'});
  await expect(noJS.locator('[data-website-case]')).toHaveCount(36);
  await context.close();
});


test('independent graph view URLs retain their scope through details, filters and history', async ({ page, request }) => {
  await page.goto('/zh-CN/prompts/website');
  await page.locator('[data-website-view][href$="/use-case/website-fun"]').click();
  await expect(page).toHaveURL(/website\/views\/use-case\/website-fun$/);
  await expect(page.locator('h1')).toHaveText('Play & exploration');
  await expect(page.locator('[data-website-case]')).toHaveCount(19);
  await page.locator('[data-website-case]').first().locator('h2 a').click();
  await page.getByRole('link', {name:'Play & exploration · 19 cases',exact:true}).click();
  await expect(page.locator('[data-website-case]')).toHaveCount(19);
  await page.getByLabel('Search cases').fill('Halloween pool');
  await page.getByRole('button', {name:'Filter',exact:true}).click();
  await expect(page.locator('[role="status"]')).toHaveText('1 of 19 website cases');
  await expect(page).toHaveURL(/website-fun\?q=Halloween\+pool/);
  await page.reload();
  await expect(page.locator('[role="status"]')).toHaveText('1 of 19 website cases');
  await page.goBack();
  await expect(page.locator('[data-website-case]')).toHaveCount(19);
  expect((await request.get('/zh-CN/prompts/website/views/tool/not-a-real-tool')).status()).toBe(404);
});
