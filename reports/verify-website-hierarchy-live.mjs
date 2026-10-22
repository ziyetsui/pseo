import { readFile,writeFile } from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {indexHash,readLibraryIndex} from '/tmp/ancher-git-beta-build/frontend/scripts/library-index-output.mjs';
import { WIREFRAME_TAXONOMIES } from '/tmp/ancher-git-beta-build/frontend/src/data/wireframe/taxonomies.ts';
import {websiteValidationGraph,verifyWebsiteViewOutput} from '/tmp/ancher-git-beta-build/frontend/scripts/website-view-output.mjs';
const {parse}=createRequire('/tmp/ancher-git-beta-build/frontend/package.json')('node-html-parser');
const origin='https://beta.ancher.site',root='/zh-CN/prompts/website';
let retries=0;
async function get(path,method='GET') {
  assert(/^\/(?:zh-CN\/prompts(?:\/[a-z0-9_/-]+)?|frontend-build\.json|library-index\.json)$/.test(path));
  for(let attempt=0;;attempt++)try{return await fetch(origin+path,{method,signal:AbortSignal.timeout(30000)});}catch(error){if(attempt>=4)throw error;retries++;await new Promise(r=>setTimeout(r,1000));}
}
const build=await(await get('/frontend-build.json')).json();
assert.equal(build.mode,'git-beta');assert.equal(build.revision,'sha256:7ca99d569485b235a84be5a7008b8d8c50e35af5f602739b59d9dda19d81e450');
const receipt=build.gitBeta;assert.equal(receipt.publishedWebsiteViews.length,30);assert.equal(receipt.importedWebsites,59);assert.equal(receipt.imagePrompts,543);
const documents=new Map(),viewChecks=[];
for(const view of [{href:root},...receipt.publishedWebsiteViews]){
  const response=await get(view.href);assert.equal(response.status,200);assert(response.headers.get('x-robots-tag')?.includes('noindex'));
  const doc=parse(await response.text());if(view.axis)assert.equal(doc.querySelectorAll('form input[disabled], form select[disabled], form button[disabled]').length,4);documents.set(view.href,doc);viewChecks.push({href:view.href,count:doc.querySelectorAll('[data-website-case]').length,title:doc.querySelector('h1')?.text});
}
const graph=JSON.parse(await readFile('/tmp/ancher-git-beta-build/docs/intake/2026-10-14/graph.json','utf8'));
const baseline=JSON.parse(await readFile('/tmp/ancher-git-beta-build/frontend/src/data/prototype.json','utf8')).prompts;
verifyWebsiteViewOutput(documents,receipt,websiteValidationGraph(graph,baseline,WIREFRAME_TAXONOMIES));
for(const [href,doc] of documents){
 const links=new Set(doc.querySelectorAll('footer a[href]').map(a=>a.getAttribute('href')));
 for(const view of receipt.publishedWebsiteViews)assert(links.has(view.href),href+' Footer missing '+view.href);
 assert(links.has('/zh-CN/prompts/library-index'));
 const view=receipt.publishedWebsiteViews.find(view=>view.href===href);
 assert(doc.querySelector(!view||view.axis==='all'?'.prototype-deck .deck':view.axis==='use-case'?'.prototype-task-findings .finding':'.prototype-anthology .model-signature'));
}
const indexPage=await get('/zh-CN/prompts/library-index');assert.equal(indexPage.status,200);
const index=readLibraryIndex(parse(await indexPage.text()),build.revision);
const indexBytes=await(await get('/library-index.json')).text();
assert.equal(indexHash(indexBytes),receipt.navigationIndex.sha256);assert.deepEqual(JSON.parse(indexBytes),index);assert.equal(index.routes.length,719);
console.log('Verified all30 live view memberships against graph; directory0 cases; all-cases60');
const details=[...new Set([...receipt.publishedPrompts,...receipt.publishedWebsites].map(item=>item.href))];assert.equal(details.length,615);
let cursor=0;const detailChecks=[];
await Promise.all(Array.from({length:6},async()=>{while(cursor<details.length){const href=details[cursor++],response=await get(href,'HEAD');detailChecks.push({href,status:response.status,robots:response.headers.get('x-robots-tag')});if(detailChecks.length%100===0)console.log(`Checked ${detailChecks.length}/615 detail routes`);}}));
assert(detailChecks.every(row=>row.status===200&&row.robots?.includes('noindex')));
const invalid=await get(root+'/views/tool/not-a-real-tool','HEAD');assert.equal(invalid.status,404);
const result={passed:true,checkedAt:new Date().toISOString(),origin,revision:build.revision,navigationRoutes:index.routes.length,websiteViews:30,websiteCases:60,importedWebsiteCases:59,detailsChecked:615,invalidViewStatus:invalid.status,retries,viewChecks,detailChecks};
await writeFile(new URL('./website-hierarchy-live-2026-10-14.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,viewChecks:undefined,detailChecks:undefined},null,2));
