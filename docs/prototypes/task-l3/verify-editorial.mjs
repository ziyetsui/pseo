import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const root=new URL('./evidence/editorial/',import.meta.url);await mkdir(root,{recursive:true});
const browser=await chromium.launch();const report=[];
try{
for(const width of [1440,375]){
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8767/editorial#tasks');
 await page.locator('#tasks a').filter({hasText:'Beauty'}).click();
 await expect(page).toHaveURL(/\/editorial\/beauty/);
 await expect(page.frameLocator('iframe').locator('.count')).toContainText('13');
 await page.screenshot({path:new URL(`current-${width}.png`,root).pathname});
 for(let v=2;v<=4;v++){
  const name=['','Current','Plate','Manifesto','Folio'][v];
  await page.getByRole('button',{name,exact:true}).click();
  await expect(page.locator('h1')).toContainText('Beauty');await expect(page.locator('.ed-count')).toHaveText('13 of 13 prompts');
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);expect(await page.evaluate(()=>scrollY)).toBe(0);
  await page.screenshot({path:new URL(`${name.toLowerCase()}-${width}.png`,root).pathname});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
  const axe=await new AxeBuilder({page}).include('.ed-shell').analyze();
  report.push({v,name,width,overflow,violations:axe.violations.map(x=>({id:x.id,impact:x.impact,targets:x.nodes.map(n=>n.target)}))});
  expect(axe.violations).toEqual([]);
  await page.getByRole('searchbox').fill('zz-no-such-prompt');
  await expect(page.getByText('No prompts match these filters.')).toBeVisible();
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();
  await page.getByRole('button',{name:'Videos',exact:true}).click();
  await expect(page.locator('.ed-count')).not.toHaveText('13 of 13 prompts');
  await page.getByRole('button',{name:'All',exact:true}).click();
  await page.getByRole('combobox',{name:'Model',exact:true}).selectOption({index:1});
  await expect(page.locator('.ed-count')).not.toHaveText('13 of 13 prompts');
  await page.getByRole('combobox',{name:'Model',exact:true}).selectOption('');
  await expect(page.locator('.ed-generate').first()).toHaveAttribute('href',/127.0.0.1:3000\/zh-CN\/prompts\//);
  await expect(page.getByRole('button',{name:/copy prompt/i})).toHaveCount(0);
  if(v===2){
   await expect(page.locator('.ed-plate-index a')).toHaveCount(13);
   await page.locator('.ed-plate-index a').first().click();
   await expect(page.locator('.ed-plate-row').first()).toBeInViewport();
   await page.locator('.ed-words summary').first().click();await expect(page.locator('.ed-words[open]')).toHaveCount(1);
  }else if(v===3){
   await expect(page.locator('.ed-specimen')).toHaveCount(3);await expect(page.locator('.ed-running a')).toHaveCount(10);
   const ids=await page.locator('.ed-specimen').evaluateAll(es=>es.map(e=>e.dataset.promptId));expect(new Set(ids).size).toBe(3);
   await page.locator('.ed-specimen').first().scrollIntoViewIfNeeded();
   await page.locator('.ed-words summary').first().click();await expect(page.locator('.ed-words[open]')).toHaveCount(1);
  }else{
   await expect(page.getByRole('button',{name:'← Previous',exact:true})).toBeDisabled();
   const first=await page.locator('.ed-spread').getAttribute('data-prompt-id');
   await page.getByRole('button',{name:'Next →',exact:true}).click();expect(await page.locator('.ed-spread').getAttribute('data-prompt-id')).not.toBe(first);
   await page.getByRole('combobox',{name:'Jump to a prompt'}).selectOption('12');
   await expect(page.getByRole('button',{name:'Next →',exact:true})).toBeDisabled();
   await page.getByRole('combobox',{name:'Jump to a prompt'}).selectOption('0');
   await expect(page.locator('.ed-leaf pre')).not.toBeEmpty();
   await page.locator('.ed-book').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
  }
  await page.screenshot({path:new URL(`${name.toLowerCase()}-content-${width}.png`,root).pathname});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 }
 await page.reload();await expect(page.getByRole('button',{name:'Folio',exact:true})).toHaveAttribute('aria-current','true');
 await page.getByRole('searchbox').focus();await page.keyboard.press('2');await expect(page.getByRole('button',{name:'Folio',exact:true})).toHaveAttribute('aria-current','true');
 await page.getByRole('searchbox').fill('');await page.getByRole('searchbox').blur();await page.keyboard.press('2');await expect(page.getByRole('button',{name:'Plate',exact:true})).toHaveAttribute('aria-current','true');
 await page.getByRole('combobox',{name:'Explore another task'}).selectOption({label:'Food & beverage · 8'});await expect(page.locator('.ed-count')).toHaveText('8 of 8 prompts');await expect(page.getByRole('button',{name:'Plate',exact:true})).toHaveAttribute('aria-current','true');
 await page.getByRole('combobox',{name:'Explore another task'}).selectOption({label:'Automotive · 1'});
 await page.getByRole('button',{name:'Manifesto',exact:true}).click();await expect(page.locator('.ed-specimen')).toHaveCount(1);await expect(page.locator('.ed-running a')).toHaveCount(0);
 await page.getByRole('button',{name:'Folio',exact:true}).click();await expect(page.getByRole('button',{name:'Next →',exact:true})).toBeDisabled();
 report.push({width,errors});expect(errors).toEqual([]);await context.close();
}
}finally{await writeFile(new URL('review.json',root),JSON.stringify(report,null,2));await browser.close()}
console.log(JSON.stringify(report,null,2));
