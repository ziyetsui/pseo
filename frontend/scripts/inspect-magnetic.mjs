import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:8766/proto-continuous-peek.html?v=2&theme=linear-dark');
await page.addStyleTag({content:'html{scroll-behavior:auto!important}.sig,.proto-picker,.theme-toggle{display:none!important}'});
await page.locator('.lede').evaluate(el=>el.scrollIntoView());
await page.waitForTimeout(1000);
console.log(await page.locator('.run .t').evaluateAll(els=>els.slice(0,15).map(el=>({text:el.textContent,style:el.getAttribute('style'),opacity:getComputedStyle(el).opacity,transform:getComputedStyle(el).transform,visibility:getComputedStyle(el).visibility}))));
await browser.close();
