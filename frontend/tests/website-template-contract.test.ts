import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import definitions from '@/data/website-placeholder-templates.json';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {websiteEntries} from '@/lib/catalog/website';
import {websiteEditableTemplate, type WebsiteTemplateManifest} from '@/lib/catalog/website-templates';
import {filledPlaceholderParts} from '@/lib/catalog/placeholders';
const hash=(text:string)=>`sha256:${createHash('sha256').update(text).digest('hex')}`;
describe('complete Website editable template contract',()=>{
 it('covers every Website case in both locales with matching editable variables while keeping sources immutable',()=>{
  const en=createGitBetaCatalog('en'),zh=createGitBetaCatalog('zh-CN');
  const rows=websiteEntries(en);expect(rows).toHaveLength(225);
  const sourceIds=rows.filter(entry=>en.prompts.some(prompt=>prompt.id===entry.id||prompt.href===entry.promptHref)).map(entry=>entry.id);
  expect(Object.keys(definitions).sort()).toEqual(sourceIds.sort());expect(sourceIds).toHaveLength(174);
  for(const entry of rows){
   const other=websiteEntries(zh).find(item=>item.id===entry.id)!;
   const before=en.prompts.find(prompt=>prompt.id===entry.id||prompt.href===entry.promptHref)?.prompt;
   const a=websiteEditableTemplate(en,entry),b=websiteEditableTemplate(zh,other);
   expect(a.variables.length,entry.id).toBeGreaterThan(0);
   expect(a.variables.map(item=>item.token).sort(),entry.id).toEqual(b.variables.map(item=>item.token).sort());
   expect(a.origin,entry.id).toBe(before?'adapted-source':'site-authored');
   expect(a.sourceText,entry.id).toBe(before??null);
   expect(en.prompts.find(prompt=>prompt.id===entry.id||prompt.href===entry.promptHref)?.prompt,entry.id).toBe(before);
   for(const template of [a,b]){
    expect(template.editableTemplate).toBe(true);
    for(const variable of template.variables)expect(template.prompt,entry.id).toContain(variable.token);
    const values=Object.fromEntries(template.variables.map(variable=>[variable.token,'A "quoted" [LITERAL] value']));
    const filled=filledPlaceholderParts(template.prompt,template.variables.map(item=>item.token),values).map(item=>item.text).join('');
    expect(filled).toContain('[LITERAL]');
    for(const variable of template.variables)expect(filled,entry.id).not.toContain(variable.token);
   }
  }
 });
 it('fails closed for missing/stale definitions and invalid replacement spans',()=>{
  const c=createGitBetaCatalog('en'),entry=websiteEntries(c).find(item=>item.promptHref)!;
  expect(()=>websiteEditableTemplate(c,entry,{})).toThrow(/Missing or stale/);
  const source=c.prompts.find(p=>p.id===entry.id||p.href===entry.promptHref)!;
  const definition={sourceHash:{en:hash(source.prompt),zh:hash(source.prompt)},replacements:[{token:'[PROJECT]',labelEn:'Project',labelZh:'项目',en:['a nonexistent literal'],zh:['不存在片段']}]};
  expect(()=>websiteEditableTemplate(c,entry,{[entry.id]:definition})).toThrow(/span/);
  expect(()=>websiteEditableTemplate(c,entry,{[entry.id]:{...definition,sourceHash:{en:hash('stale'),zh:hash('stale')}}})).toThrow(/stale/);
 });
 it('rejects editing JSON keys or typed scalar values',()=>{
  const c=createGitBetaCatalog('en'),entry=websiteEntries(c).find(item=>item.promptHref)!;
  const p=c.prompts.find(p=>p.id===entry.id||p.href===entry.promptHref)!;
  const body='{"scene":"coffee shop","count":2}';
  const catalog={...c,prompts:[{...p,prompt:body}]};
  const definitions:WebsiteTemplateManifest={[entry.id]:{sourceHash:{en:hash(body),zh:hash(body)},replacements:[{token:'[SCENE]',labelEn:'Scene',labelZh:'场景',en:['scene'],zh:['scene']}]}};
  expect(()=>websiteEditableTemplate(catalog,entry,definitions)).toThrow(/JSON contract/);
 });
});
