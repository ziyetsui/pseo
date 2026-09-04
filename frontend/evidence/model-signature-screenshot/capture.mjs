import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const dir=new URL('./',import.meta.url).pathname;
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1507,height:834},reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:3000/zh-CN/prompts/model-families/nano-banana');
 await page.evaluate(()=>document.fonts.ready);
 for (const width of [1507,375]) {
  await page.setViewportSize({width,height:834});
  await page.screenshot({path:dir+`signature-${width}.png`});
 }
 const facts=await page.evaluate(()=>({h1:[...document.querySelectorAll('h1')].map(n=>n.textContent),credits:[...document.querySelectorAll('.msh-credits a')].map(n=>({text:n.textContent,href:n.href})),overflow:document.documentElement.scrollWidth>innerWidth+1}));
 await fs.writeFile(dir+'check.json',JSON.stringify(facts,null,2));
} finally {await browser.close();}
