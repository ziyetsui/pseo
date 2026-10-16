import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const taskPath = '/zh-CN/prompts/use-cases/beauty';

test('Browse by task opens the Plate with scoped, shareable filters and real L4 links', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/zh-CN/prompts');
  await page.locator('#tasks a.tile').filter({hasText:'Beauty'}).click();
  await expect(page).toHaveURL(new RegExp(`${taskPath}$`));
  await expect(page.locator('.prototype-task-plate .style-results[data-task="beauty"]')).toBeVisible();
  await expect(page.locator('main h1')).toContainText('Beauty.');
  await expect(page.locator('.ctrl [role="status"]')).toHaveText('13 of 13 Beauty prompts');
  await expect(page.locator('.plate')).toHaveCount(13);
  // The fixed task is not offered as a filter; style takes its place.
  await expect(page.locator('.ctrl .chip').filter({hasText:'Beauty'})).toHaveCount(0);
  const model = page.locator('.ctrl button').filter({hasText:'Nano Banana Pro'});
  await model.click();await expect(page).toHaveURL(/model=nano-banana-pro/);
  await expect(page.locator('.ctrl [role="status"]')).toHaveText('7 of 13 Beauty prompts');
  await page.reload();await expect(model).toHaveAttribute('aria-pressed','true');
  await page.locator('.ctrl button').filter({hasText:'Luxury'}).click();
  await expect(page).toHaveURL(/style=luxury/);
  await page.goBack();await expect(page.locator('.ctrl [role="status"]')).toHaveText('7 of 13 Beauty prompts');
  await page.locator('.ctrl').getByRole('button',{name:'Clear filters',exact:true}).click();
  await expect(page.locator('.ctrl [role="status"]')).toHaveText('13 of 13 Beauty prompts');
  const title = await page.locator('.plate h3').first().innerText();
  await page.locator('.plate .rr a').filter({hasText:'Full record'}).first().click();
  await expect(page.locator('.prototype-recipe h1')).toHaveText(title);
  await page.goBack();await expect(page.locator('.prototype-task-plate')).toBeVisible();
  await expect(page.locator('.plate .rr a').filter({hasText:'Generate image'}).first()).toHaveAttribute('target','_blank');
  await expect(page.locator('main #tasks .tiles')).toBeVisible();
  expect(errors).toEqual([]);
});

test('empty filters, other tasks, unchanged models, and unknown tasks', async ({ page }) => {
  await page.goto(`${taskPath}?q=zz-no-result`);
  await expect(page.locator('.empty')).toBeVisible();
  await page.locator('.empty button').click();await expect(page).toHaveURL(new RegExp(`${taskPath}$`));
  await expect(page.locator('.plate')).toHaveCount(13);
  await page.locator('main #tasks a.tile').filter({hasText:'Food & beverage'}).click();
  await expect(page.locator('.ctrl [role="status"]')).toHaveText('5 of 5 Food & beverage prompts');
  await page.goto('/zh-CN/prompts/models/nano-banana-pro');await expect(page.locator('.prototype-anthology')).toBeVisible();
  await page.goto('/zh-CN/prompts?useCase=beauty');await expect(page.locator('.prototype-task-plate')).toHaveCount(0);
  expect((await page.goto('/zh-CN/prompts/use-cases/not-a-task'))?.status()).toBe(404);
});

test('task Plate is responsive, accessible, and readable without JS', async ({ page, browser }) => {
  await page.goto(taskPath);await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  const context = await browser.newContext({javaScriptEnabled:false});const noJS = await context.newPage();
  const response = await noJS.goto(`${process.env.FRONTEND_TEST_URL ?? 'http://127.0.0.1:3000'}${taskPath}`);
  expect(response?.status()).toBe(200);await expect(noJS.locator('h1')).toContainText('Beauty');
  await expect(noJS.locator('.plate .wall').first()).not.toBeEmpty();await context.close();
});
