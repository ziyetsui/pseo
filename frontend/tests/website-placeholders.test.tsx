import {describe,it,expect} from 'vitest';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {websiteEntries} from '@/lib/catalog/website';
import {websiteEditableTemplate} from '@/lib/catalog/website-templates';
import definitions from '@/data/website-placeholder-templates.json';
import {gitBetaRevision} from '@/lib/catalog/git-beta-revision';
describe('reviewed Website template spans',()=>{
 it('preserves every byte outside selected inputs in both languages',()=>{
  for(const locale of ['en','zh-CN'] as const){
   const catalog=createGitBetaCatalog(locale),key=locale==='en'?'en':'zh';
   for(const entry of websiteEntries(catalog)){
    const definition=definitions[entry.id as keyof typeof definitions];if(!definition)continue;
    const template=websiteEditableTemplate(catalog,entry),source=template.sourceText!;
    const spans=definition.replacements.flatMap(rule=>rule[key].flatMap(original=>[...source.matchAll(new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))].map(match=>({start:match.index!,end:match.index!+original.length,token:rule.token})))).sort((a,b)=>a.start-b.start);
    let expected='',position=0;
    for(const span of spans){expect(span.start,entry.id).toBeGreaterThanOrEqual(position);expected+=source.slice(position,span.start)+span.token;position=span.end;}
    expected+=source.slice(position);
    expect(template.prompt,entry.id).toBe(expected);
   }
  }
 });
 it('uses actual source language and binds templates to the revision',()=>{
  const catalog=createGitBetaCatalog('en');
  const row=websiteEntries(catalog).find(row=>row.id==='websitecase_84b6747412c7ee888e5d5908bb57348f')!;
  expect(websiteEditableTemplate(catalog,row).language).toBe('zh-CN');
  expect(gitBetaRevision('base',{},{},{},{},{},{one:1})).not.toBe(gitBetaRevision('base',{},{},{},{},{},{one:2}));
 });
});
