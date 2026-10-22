import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {websiteValidationGraph,verifyWebsiteViewOutput} from '/tmp/ancher-git-beta-build/frontend/scripts/website-view-output.mjs';
import {readLibraryIndex,indexHash} from '/tmp/ancher-git-beta-build/frontend/scripts/library-index-output.mjs';
import {WIREFRAME_TAXONOMIES} from '/tmp/ancher-git-beta-build/frontend/src/data/wireframe/taxonomies.ts';
const {parse}=createRequire('/tmp/ancher-git-beta-build/frontend/package.json')('node-html-parser');
const origin='https://beta.ancher.site';let retries=0;
async function get(href){for(let attempt=0;;attempt++)try{const response=await fetch(origin+href,{signal:AbortSignal.timeout(30000)});if(response.status>=500&&attempt<4){retries++;continue;}return response;}catch(error){if(attempt===4)throw error;retries++;}}
const build=await(await get('/frontend-build.json')).json();assert.equal(build.mode,'git-beta');assert.equal(build.revision,'sha256:67403c0a302b0a7c7abf1a4a288a7ae20968127dab76b8eef3d70186bfce9492');assert.deepEqual(build.gitBeta.locales.map(row=>row.locale),['zh-CN','en']);
const graph=JSON.parse(await readFile('/tmp/ancher-git-beta-build/docs/intake/2026-10-14-website-supplement/combined-graph.json','utf8')),baseline=JSON.parse(await readFile('/tmp/ancher-git-beta-build/frontend/src/data/prototype.json','utf8')).prompts;
const validation=websiteValidationGraph(graph,baseline,WIREFRAME_TAXONOMIES),checks=[];
for(const local of build.gitBeta.locales){
 const locale=local.locale,target=locale==='en'?'zh-CN':'en',documents=new Map();
 for(const href of [...new Set([`/${locale}/prompts`,`/${locale}/prompts/image`,`/${locale}/prompts/video`,`/${locale}/prompts/library-index`,`/${locale}/prompts/website`,...local.publishedWebsiteViews.map(view=>view.href),local.publishedPrompts[0].href,local.publishedWebsites[0].href])]){
  const response=await get(href);assert.equal(response.status,200);assert(response.headers.get('x-robots-tag')?.includes('noindex'));
  const doc=parse(await response.text());documents.set(href,doc);
  assert.equal(doc.querySelector('html')?.getAttribute('lang'),locale);assert.equal(doc.querySelector('body')?.getAttribute('lang'),locale);
  assert.equal(doc.querySelector('[data-language-switch]')?.getAttribute('href'),href.replace(`/${locale}`,`/${target}`));
  const links=new Set(doc.querySelectorAll('footer a[href]').map(link=>link.getAttribute('href')));for(const view of local.publishedWebsiteViews)assert(links.has(view.href));
  checks.push({locale,href,title:doc.querySelector('h1')?.text,cases:doc.querySelectorAll('[data-website-case]').length});
 }
 verifyWebsiteViewOutput(documents,local,validation,locale);
 const index=readLibraryIndex(documents.get(`/${locale}/prompts/library-index`),build.revision,locale),indexBytes=await(await get(local.navigationIndex.path)).text();assert.equal(indexHash(indexBytes),local.navigationIndex.sha256);assert.deepEqual(JSON.parse(indexBytes),index);
 assert.equal(index.routes.length,891);assert(index.routes.every(href=>href.startsWith(`/${locale}/`)));
 assert.equal((await get(`/${locale}/prompts/website/views/tool/not-real`)).status,404);
}
assert.equal((await get('/fr/prompts')).status,404);
const result={passed:true,checkedAt:new Date().toISOString(),origin,revision:build.revision,locales:2,viewsPerLocale:30,casesPerLocale:225,directoryRoutesPerLocale:891,checks,retries};
await writeFile(new URL('./bilingual-live-2026-10-14.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,checks:undefined},null,2));
