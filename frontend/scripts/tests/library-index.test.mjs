import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parse} from 'node-html-parser';
import {readLibraryIndex,verifyLibraryIndex,indexHash,publishedNavigation} from '../library-index-output.mjs';
const href='/zh-CN/prompts/website/views/all',station='/zh-CN/prompts/library-index';
const index={schemaVersion:1,locale:'zh-CN',revision:'rev',groups:[{id:'g',title:'Views',entries:[{id:'v',label:'All',href}]}],collections:[],routes:[href]};
const document=value=>parse(`<script id="library-navigation-index" type="application/json">${JSON.stringify(value)}</script>`);
test('reads revision-bound exact routes and hashes exact artifact bytes',()=>{
 assert.deepEqual(readLibraryIndex(document(index),'rev'),index);
 assert.equal(indexHash('abc'),'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('rejects stale revision, unsafe routes, omitted or duplicate route sets',()=>{
 for(const value of [{...index,revision:'stale'},{...index,routes:[]},{...index,routes:[href,href]},{...index,groups:[{id:'g',title:'bad',entries:[{id:'v',label:'bad',href:'https://example.com'}]}]}])assert.throws(()=>readLibraryIndex(document(value),'rev'));
});
test('requires every published object, full index view and compact Footer directory link',()=>{
 const receipt={publishedPrompts:[],publishedWebsites:[],publishedWebsiteViews:[{href}]};
 const documents=new Map([[href,parse(`<footer><nav class="footnav"><a href="/zh-CN/prompts/website"></a><a href="${station}"></a></nav></footer>`)]]);
 assert.doesNotThrow(()=>verifyLibraryIndex(documents,index,receipt));
 assert.throws(()=>verifyLibraryIndex(new Map(),index,receipt));
 assert.throws(()=>verifyLibraryIndex(documents,index,{...receipt,publishedPrompts:[{href:'/zh-CN/prompts/missing'}]}));
 assert.throws(()=>verifyLibraryIndex(new Map([[href,parse(`<footer><a href="${station}"></a></footer>`)]]),index,receipt));
});
test('validates English indexes against English routes and rejects cross-locale leakage',()=>{
 const english={...index,locale:'en',groups:index.groups.map(group=>({...group,entries:group.entries.map(entry=>({...entry,href:entry.href.replace('/zh-CN/','/en/')}))})),routes:index.routes.map(href=>href.replace('/zh-CN/','/en/'))};
 assert.deepEqual(readLibraryIndex(document(english),'rev','en'),english);
 assert.throws(()=>readLibraryIndex(document(index),'rev','en'));
 assert.throws(()=>readLibraryIndex(document({...english,routes:index.routes}),'rev','en'));
});
test('accepts the authorized five-column 27-link footer and rejects overflow',()=>{
 const receipt={publishedPrompts:[],publishedWebsites:[],publishedWebsiteViews:[]};
 const doc=count=>parse(`<footer><nav class="footnav"><a href="${station}"></a>${Array.from({length:count-1},(_,i)=>`<a href="/zh-CN/prompts/example-${i}"></a>`).join('')}</nav></footer>`);
 assert.doesNotThrow(()=>verifyLibraryIndex(new Map([[href,doc(27)]]),index,receipt));
 assert.throws(()=>verifyLibraryIndex(new Map([[href,doc(28)]]),index,receipt));
});

test('records all monetization levels as navigation without admitting unrelated detail routes',()=>{
 const base='/en/prompts';
 assert.deepEqual(publishedNavigation({routes:[`${base}/monetization`,`${base}/monetization/commerce`,`${base}/monetization/commerce/fashion`,`${base}/some-detail`]},'en').map(item=>item.href),[`${base}/library-index`,`${base}/monetization`,`${base}/monetization/commerce`,`${base}/monetization/commerce/fashion`]);
});
