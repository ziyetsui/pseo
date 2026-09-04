import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const taskPath = '/zh-CN/prompts/use-cases/beauty';

test('Browse by task opens Findings with scoped, shareable filters and real L4 links', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/zh-CN/prompts');
  await page.locator('#tasks a.tile').filter({hasText:'Beauty'}).click();
  await expect(page).toHaveURL(new RegExp(`${taskPath}$`));
  await expect(page.locator('h1')).toHaveText('Beauty prompts are specifications.');
  await expect(page.locator('.ctrl [role="status"]')).toHaveText('13 of 13 Beauty prompts');
  await expect(page.locator('[data-finding="portrait"] h2')).toHaveText('All thirteen of them are portraits.');
  const model = page.locator('.ctrl button').filter({hasText:'Nano Banana Pro'});
  await model.click();await expect(page).toHaveURL(/model=nano-banana-pro/);
  await expect(page.locator('.ctrl [role="status"]')).toHaveText('7 of 13 Beauty prompts');
  await page.reload();await expect(model).toHaveAttribute('aria-pressed','true');
  await page.locator('.ctrl button').filter({hasText:'Luxury'}).click();
  await expect(page).toHaveURL(/style=luxury/);
  await page.goBack();await expect(page.locator('.ctrl [role="status"]')).toHaveText('7 of 13 Beauty prompts');
  await page.locator('.ctrl').getByRole('button',{name:'Clear filters',exact:true}).click();
  await expect(page.locator('.ctrl [role="status"]')).toHaveText('13 of 13 Beauty prompts');
  const title = await page.locator('.spec h3').first().innerText();
  await page.locator('.spec .rr a').filter({hasText:'Generate image'}).first().click();
  await expect(page.locator('.prototype-recipe h1')).toHaveText(title);
  await page.goBack();await expect(page.locator('.prototype-task-findings')).toBeVisible();
  await expect(page.getByRole('button',{name:/copy prompt/i})).toHaveCount(0);
  await expect(page.locator('.proto-picker,iframe')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('other tasks, empty filters, unchanged models, and unknown tasks', async ({ page }) => {
  await page.goto(taskPath);
  await page.locator('.ctrl a').filter({hasText:'Automotive'}).click();
  await expect(page.locator('.ctrl [role="status"]')).toHaveText('1 of 1 Automotive prompt');
  await expect(page.locator('main h1')).toHaveText('Automotive prompts are specifications.');
  await page.locator('.ctrl a').filter({hasText:'Food & beverage'}).click();
  await expect(page.locator('.ctrl [role="status"]')).toHaveText('5 of 5 Food & beverage prompts');
  await page.goto(`${taskPath}?q=zz-no-result&useCase=automotive`);
  await expect(page.locator('.empty')).toBeVisible();
  await page.locator('.empty button').click();await expect(page).toHaveURL(new RegExp(`${taskPath}$`));
  await expect(page.locator('.ctrl [role="status"]')).toHaveText('13 of 13 Beauty prompts');
  await page.goto('/zh-CN/prompts/models/nano-banana-pro');await expect(page.locator('.prototype-anthology')).toBeVisible();
  await page.goto('/zh-CN/prompts?useCase=beauty');await expect(page.locator('.prototype-task-findings')).toHaveCount(0);
  expect((await page.goto('/zh-CN/prompts/use-cases/not-a-task'))?.status()).toBe(404);
});

test('Findings responsive, keyboard accessible, and no-JS content available', async ({ page, browser }, testInfo) => {
  await page.goto(taskPath);await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.screenshot({path:`evidence/task-findings/implementation-${testInfo.project.name}.png`});
  await page.locator('.spec').first().evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
  await page.waitForFunction(()=>{const i=document.querySelector('.spec img');return !i || i instanceof HTMLImageElement&&i.complete});
  await page.screenshot({path:`evidence/task-findings/specimen-${testInfo.project.name}.png`});
  await page.locator('.ctrl button').first().focus();await page.keyboard.press('Enter');
  await expect(page.locator('.ctrl button').first()).toHaveAttribute('aria-pressed','true');
  const context = await browser.newContext({javaScriptEnabled:false});const noJS = await context.newPage();
  const response = await noJS.goto(`${process.env.FRONTEND_TEST_URL ?? 'http://127.0.0.1:3000'}${taskPath}`);
  expect(response?.status()).toBe(200);await expect(noJS.locator('h1')).toContainText('Beauty');
  await expect(noJS.locator('.spec .verbatim').first()).not.toBeEmpty();
  await expect(noJS.locator('.allof a')).toHaveCount(8);await context.close();
});


test('Findings keeps long headings and sticky controls within narrow and tablet widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Viewport coverage runs once.');
  for (const width of [320, 360, 768, 1024]) {
    await page.setViewportSize({width,height:900});
    await page.goto('/zh-CN/prompts/use-cases/web-motion-design');
    await expect(page.locator('h1')).toContainText('Web & motion design');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.ctrl button').first().click();
  await expect(page.locator('.ctrl button').first()).toHaveAttribute('aria-pressed','true');
});
