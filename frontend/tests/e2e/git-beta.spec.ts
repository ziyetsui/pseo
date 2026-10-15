import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Website filters wait for hydration before accepting input', async ({ page }) => {
  let releaseScripts = () => {};
  const gate = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.route('**/_next/static/**/*.js', async route => { await gate; await route.continue(); });
  try {
    await page.goto('/en/prompts/website/views/use-case/creative-coding', {waitUntil:'commit'});
    await expect(page.getByLabel('Search cases')).toBeDisabled();
    await expect(page.getByRole('button', {name:'Filter',exact:true})).toBeDisabled();
    releaseScripts();
    await expect(page.getByLabel('Search cases')).toBeEnabled();
    await page.getByLabel('Search cases').fill('Halloween pool');
    await page.getByRole('button', {name:'Filter',exact:true}).click();
    await expect(page.locator('[role="status"]')).toHaveText('1 of 67 website cases');
  } finally { releaseScripts(); }
});

test('published Git beta exposes real image and Website counts, sources and project pages', async ({ page, request }) => {
  const response = await request.get('/frontend-build.json');
  const receipt = await response.json();
  expect(receipt.mode).toBe('git-beta');
  expect(receipt.gitBeta.importedImageRecords).toBe(541);
  expect(receipt.gitBeta.importedImageExamples).toBe(541);
  expect(receipt.gitBeta.importedWebsites).toBe(59);
  await page.goto('/en/prompts#category');
  await expect(page.locator('#category a.tile').filter({hasText:'Images'}).locator('p')).toHaveText('543 prompts');
  await expect(page.locator('#category a.tile').filter({hasText:'Web design & development'}).locator('p')).toHaveText('225 cases');
  await page.locator('#category a.tile').filter({hasText:'Web design & development'}).click();
  await expect(page.locator('h1')).toHaveText('Web design & development');
  await expect(page.locator('[data-website-case]')).toHaveCount(0);
  await expect(page.locator('[data-website-view]')).toHaveCount(27);
  await page.locator('[data-website-view][data-view-axis=all]').click();
  await expect(page.locator('h1')).toHaveText('All website cases');
  await expect(page.locator('[data-website-case]')).toHaveCount(225);
  await page.locator('.website-title-index a[data-case-title]').nth(1).click();
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('a').filter({hasText:'View original source'})).toHaveAttribute('href', /^https:\/\/x.com\//);
  await expect(page.getByText('Site-authored template · the collected source did not include prompt text.', {exact:true})).toBeVisible();
  expect((await request.get('/en/prompts/website/not-a-real-case')).status()).toBe(404);
});

test('Website search and model filters survive reload and browser history', async ({ page }) => {
  await page.goto('/en/prompts/website/views/all');
  await page.getByLabel('Search cases').fill('Halloween pool');
  await page.getByRole('button', {name:'Filter',exact:true}).click();
  await expect(page.locator('[role="status"]')).toHaveText('1 of 225 website cases');
  await expect(page).toHaveURL(/q=Halloween\+pool/);
  await expect(page.getByRole('button', {name:'Filter',exact:true})).toBeFocused();
  await page.reload();
  await expect(page.locator('[role="status"]')).toHaveText('1 of 225 website cases');
  await page.goBack();
  await expect(page.locator('[role="status"]')).toHaveText('225 of 225 website cases');
  await page.getByRole('combobox', {name:'Model',exact:true}).selectOption('claude');
  await page.getByRole('button', {name:'Filter',exact:true}).click();
  await expect(page).toHaveURL(/model=claude/);
  await expect(page.locator('[role="status"]')).not.toHaveText('225 of 225 website cases');
  await page.getByLabel('Search cases').fill('no-real-case-can-match-this');
  await page.getByRole('button', {name:'Filter',exact:true}).click();
  await expect(page.getByRole('heading',{name:'No website case matches those filters.'})).toBeVisible();
  await page.getByRole('link',{name:'Browse all cases',exact:true}).click();
  await expect(page.locator('[data-website-case]')).toHaveCount(225);
});

test('case collection remains accessible, responsive and readable without JavaScript', async ({ page, browser }, testInfo) => {
  await page.goto('/en/prompts/website');
  const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  for (const width of [375,768,1440]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`git-beta-website-${width}.png`)});
  }
  const context = await browser.newContext({javaScriptEnabled:false});
  const noJS = await context.newPage();
  await noJS.goto(`${process.env.FRONTEND_TEST_URL}/en/prompts/website`, {waitUntil:'domcontentloaded'});
  await expect(noJS.locator('[data-website-case]')).toHaveCount(0);
  await expect(noJS.locator('[data-website-view]')).toHaveCount(27);
  await expect(noJS.locator('h1')).toHaveText('Web design & development');
  await noJS.goto(`${process.env.FRONTEND_TEST_URL}/en/prompts/website/views/tool/three-js`, {waitUntil:'domcontentloaded'});
  await expect(noJS.locator('[data-website-case]')).toHaveCount(36);
  await context.close();
});


test('independent graph view URLs retain their scope through details, filters and history', async ({ page, request }) => {
  await page.goto('/en/prompts/website');
  await page.locator('[data-website-view][href$="/use-case/creative-coding"]').click();
  await expect(page).toHaveURL(/website\/views\/use-case\/creative-coding$/);
  await expect(page.locator('h1')).toHaveText('Creative coding');
  await expect(page.locator('[data-website-case]')).toHaveCount(67);
  await page.locator('[data-website-case]').first().locator('a[data-case-title]').click();
  await page.locator('main').getByRole('link', {name:'Creative coding · 67 cases',exact:true}).click();
  await expect(page.locator('[data-website-case]')).toHaveCount(67);
  await page.getByLabel('Search cases').fill('Halloween pool');
  await page.getByRole('button', {name:'Filter',exact:true}).click();
  await expect(page.locator('[role="status"]')).toHaveText('1 of 67 website cases');
  await expect(page).toHaveURL(/creative-coding\?q=Halloween\+pool/);
  await page.reload();
  await expect(page.locator('[role="status"]')).toHaveText('1 of 67 website cases');
  await page.goBack();
  await expect(page.locator('[data-website-case]')).toHaveCount(67);
  expect((await request.get('/en/prompts/website/views/tool/not-a-real-tool')).status()).toBe(404);
});
