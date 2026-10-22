import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {indexHash} from '/tmp/ancher-git-beta-build/frontend/scripts/library-index-output.mjs';
const {parse}=createRequire('/tmp/ancher-git-beta-build/frontend/package.json')('node-html-parser');
const origin='https://beta.ancher.site',href='/zh-CN/prompts/website/views/use-case/website-fun';
let retries=0;
async function get(href){for(let attempt=0;;attempt++)try{return await fetch(origin+href,{signal:AbortSignal.timeout(30000)});}catch(error){if(attempt===4)throw error;retries++;}}
const response=await get(href);assert.equal(response.status,200);assert(response.headers.get('x-robots-tag')?.includes('noindex'));
const remote=parse(await response.text()),local=parse(await readFile('/tmp/ancher-git-beta-build/frontend/out'+href+'.html','utf8'));
const styles=doc=>doc.querySelectorAll('link[rel=stylesheet]').map(link=>link.getAttribute('href')).sort();assert.deepEqual(styles(remote),styles(local));assert.equal(remote.querySelectorAll('[data-website-case]').length,19);
const build=await(await get('/frontend-build.json')).json();assert.equal(build.mode,'git-beta');assert.equal(build.revision,'sha256:7ca99d569485b235a84be5a7008b8d8c50e35af5f602739b59d9dda19d81e450');
const footerLinks=new Set(remote.querySelectorAll('footer a[href]').map(link=>link.getAttribute('href')));for(const view of build.gitBeta.publishedWebsiteViews)assert(footerLinks.has(view.href));
const index=await(await get('/library-index.json')).text();assert.equal(indexHash(index),build.gitBeta.navigationIndex.sha256);assert.equal(JSON.parse(index).routes.length,719);
const deployments=JSON.parse(await readFile('/tmp/ancher-website-chip-deployments.json','utf8'));
const final=deployments.filter(row=>row.Source==='0126294');assert(final.some(row=>row.Branch==='main'));assert(final.some(row=>row.Branch==='frontend-design'));
const result={passed:true,checkedAt:new Date().toISOString(),origin,source:'0126294bfe8523cef3b3caadf200d31ed7de71cb',revision:build.revision,styles:styles(remote),purposeCases:19,websiteViews:build.gitBeta.publishedWebsiteViews.length,indexRoutes:719,deployments:final,retries};
await writeFile(new URL('./website-hierarchy-final-2026-10-14.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
