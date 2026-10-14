import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parse} from 'node-html-parser';
import {readLibraryIndex,verifyLibraryIndex,indexHash} from '../library-index-output.mjs';
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
test('requires every published object, exported route and Footer link',()=>{
 const receipt={publishedPrompts:[],publishedWebsites:[],publishedWebsiteViews:[{href}]};
 const documents=new Map([[href,parse(`<footer><a href="${href}"></a><a href="${station}"></a></footer>`)]]);
 assert.doesNotThrow(()=>verifyLibraryIndex(documents,index,receipt));
 assert.throws(()=>verifyLibraryIndex(new Map(),index,receipt));
 assert.throws(()=>verifyLibraryIndex(documents,index,{...receipt,publishedPrompts:[{href:'/zh-CN/prompts/missing'}]}));
 assert.throws(()=>verifyLibraryIndex(new Map([[href,parse(`<footer><a href="${station}"></a></footer>`)]]),index,receipt));
});
