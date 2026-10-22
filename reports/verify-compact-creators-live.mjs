import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {parse}=createRequire('/Users/ziye/Developer/ancher pseo release/frontend/package.json')('node-html-parser');
const origin='https://beta.ancher.site',root='/Users/ziye/Developer/ancher pseo release/frontend/out',checks=[];
for(const locale of ['en','zh-CN'])for(const suffix of ['','/models/gpt-image-2','/use-cases/photography-realism']){
 const href=`/${locale}/prompts${suffix}`,response=await fetch(origin+href,{signal:AbortSignal.timeout(45000)});
 assert.equal(response.status,200);assert(response.headers.get('x-robots-tag')?.includes('noindex'));
 const live=parse(await response.text()),expected=parse(await readFile(root+href+'.html','utf8'));
 assert.equal(live.querySelector('html')?.getAttribute('lang'),locale);
 const section=live.querySelector('#creators'),reference=expected.querySelector('#creators');assert(section&&reference);
 const preview=section.querySelectorAll('.creator-preview > a');assert.equal(preview.length,8);
 const details=section.querySelector('details.creator-more');assert(details&&!details.hasAttribute('open'));
 const authors=doc=>doc.querySelectorAll('a.person,a.creator').map(a=>a.getAttribute('href'));
 assert.deepEqual(authors(section),authors(reference));
 assert(details.querySelector('summary')?.text.includes(locale==='en'?'View all':'查看全部'));
 checks.push({href,initialAuthors:preview.length,totalAuthors:authors(section).length});
}
const result={passed:true,checkedAt:new Date().toISOString(),origin,checks};
await writeFile(new URL('./compact-creators-live-2026-10-15.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
