import {describe,it,expect} from 'vitest';
import {createGitBetaCatalog} from '../src/lib/catalog/git-beta';
import {renderToStaticMarkup} from 'react-dom/server';
import {parse} from 'node-html-parser';
import {WebsiteDeck} from '../src/components/WebsiteDeck';
import {Hub} from '../src/components/Hub';
import {filterWebsiteCases} from '../src/lib/catalog/website-filter';
import {websiteEntries} from '../src/lib/catalog/website';
import {caseCopy} from '../src/lib/i18n/case-copy';
describe('localized case presentation',()=>{
 it('uses English case titles and descriptions throughout the English catalog',()=>{
  const catalog=createGitBetaCatalog('en');
  const strings=[...catalog.prompts,...(catalog.websites??[])].flatMap(row=>[row.title,row.summary]);
  expect(strings.filter(value=>/\p{Script=Han}/u.test(value))).toEqual([]);
 });
 it('renders every English homepage title without Chinese and retains bilingual search results',()=>{
  const en=createGitBetaCatalog('en'),zh=createGitBetaCatalog('zh-CN');
  const doc=parse(renderToStaticMarkup(<Hub catalog={en} />));
  const titles=doc.querySelectorAll('[data-entry] .u');
  expect(titles).toHaveLength(54);
  expect(parse(doc.querySelector("noscript")?.innerHTML??"").querySelectorAll("a")).toHaveLength(en.prompts.length);
  expect(titles.every(node=>!/[\u3400-\u9fff]/u.test(node.text))).toBe(true);
  for(const q of ['Halloween pool','万圣节泳池'])expect(filterWebsiteCases(websiteEntries(en),{q}).map(row=>row.id)).toEqual(filterWebsiteCases(websiteEntries(zh),{q}).map(row=>row.id));
  expect(()=>caseCopy('unprovided display copy','en')).toThrow('Missing en');
 });
 it('keeps translated descriptions outside the separately marked source prompt',()=>{
  const doc=parse(renderToStaticMarkup(<WebsiteDeck uiLocale="zh-CN" kind="case" items={[{id:'test',title:'示例标题',summary:'中文介绍',caption:'案例',href:'/zh-CN/prompts/test',cover:'',prompt:'Original English prompt',language:'en'}]} />));
  expect(doc.querySelector('pre')?.previousElementSibling?.text).toBe('原文语言：英语');
  expect(doc.querySelector('pre')?.text).toBe('Original English prompt');
 });
 it('localizes Chinese titles while preserving prompt text and graph identities',()=>{
  const zh=createGitBetaCatalog('zh-CN'),en=createGitBetaCatalog('en');
  expect(zh.prompts.find(row=>row.slug==='prompt-portrait-photography-from-above-ana-d-2015726421990056336')?.title).toBe('洛杉矶星光大道俯拍人像');
  expect(zh.prompts.map(row=>[row.id,row.prompt,row.variables.map(variable=>[variable.token,variable.defaultValue,variable.options])])).toEqual(en.prompts.map(row=>[row.id,row.prompt,row.variables.map(variable=>[variable.token,variable.defaultValue,variable.options])]));
  expect(zh.websiteGraph?.edges).toEqual(en.websiteGraph?.edges);
  expect(zh.prompts.flatMap(row=>row.evidence).every(item=>item.type==='合集说明文档')).toBe(true);
 });
});
