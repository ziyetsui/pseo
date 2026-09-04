import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch();await mkdir('evidence',{recursive:true});const report=[];
for(const width of [1440,375]){
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 /* Enter through /browse, not /: production's HubBand now builds task hrefs from the locale
    (`/zh-CN/prompts/use-cases/<slug>`) rather than from ref.href, so the entry page's own tiles
    leave this prototype for the real frontend. The band exploration's copy still routes here. */
 await page.goto('http://127.0.0.1:8767/browse');await page.locator('#tasks a').filter({hasText:'Beauty'}).click();await expect(page).toHaveURL(/\/tasks\/beauty/);
 await expect(page.frameLocator('iframe').locator('.count')).toContainText('13');
 await page.screenshot({path:`evidence/current-${width}.png`});
 for(let v=2;v<=4;v++){
  await page.getByRole('button',{name:['','Current','Matrix','Lanes','Index'][v],exact:true}).click();
  await expect(page.locator('h1')).toContainText('Beauty prompts');await expect(page.locator('.result-count')).toHaveText('13 / 13 prompts');
  await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(800);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
  await page.screenshot({path:`evidence/v${v}-${width}.png`});
  const axe=await new AxeBuilder({page}).include('.task-shell').analyze();report.push({v,width,overflow,violations:axe.violations.map(x=>({id:x.id,impact:x.impact,targets:x.nodes.map(n=>n.target)}))});
  await page.getByRole('searchbox').fill('zz-no-such-prompt');await expect(page.getByText('No prompts match this search.')).toBeVisible();await page.getByRole('button',{name:'Clear filters',exact:true}).click();
  await page.getByRole('button',{name:'Videos',exact:true}).click();await expect(page.locator('.result-count')).toContainText('/ 13 prompts');await page.getByRole('button',{name:'All',exact:true}).click();
  if(v===2){await page.locator('.task-matrix td button').first().click();await expect(page.locator('.task-matrix td button[aria-pressed=true]')).toHaveCount(1);await page.getByRole('button',{name:'Clear selection',exact:true}).click();}
  if(v<4){await page.locator('.card-image').first().click();await expect(page.locator('dialog')).toBeVisible();await expect(page.locator('dialog .primary-action')).toHaveAttribute('href',/127.0.0.1:3000\/zh-CN\/prompts\//);await page.screenshot({path:`evidence/v${v}-detail-${width}.png`});await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();}
  else{await page.locator('.index-row').nth(1).click();await expect(page.locator('.index-row[aria-pressed=true]')).toHaveCount(1);await expect(page.locator('.index-reader pre')).not.toBeEmpty();}
 }
 await page.reload();await expect(page.getByRole('button',{name:'Index',exact:true})).toHaveAttribute('aria-current','true');
 /* Read the option out of the DOM rather than pinning its count: the visual fixture's taxonomy
    is edited independently of this exploration, and a hard-coded 8 fails on a data change alone. */
 const other=await page.locator('.task-switch option').filter({hasText:'Food & beverage'}).getAttribute('value');
 await page.getByRole('combobox',{name:'Explore another task'}).selectOption(other);await expect(page.locator('h1')).toContainText('Food & beverage');await expect(page.locator('.result-count')).toHaveText(/^(\d+) \/ \1 prompts$/);
 report.push({width,errors});expect(errors).toEqual([]);await page.close();
}
await writeFile('evidence/review.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report,null,2));
