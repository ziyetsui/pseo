import { describe, expect, it } from 'vitest';
import { appendQueenieCatalog, readQueenieDataset } from '@/lib/catalog/queenie';
import { createFixtureCatalog } from '@/lib/catalog/fixture';

const copy = (language: 'en' | 'zh-CN') => ({ title: language === 'en' ? 'Illustrated editorial cover' : '插画封面', summary: language === 'en' ? 'A reference image study.' : '参考图片拆解。', prompt: language === 'en' ? 'Create [SUBJECT] in a clean composition.' : '以简洁构图绘制[SUBJECT]。', variables: [{ token: '[SUBJECT]', label: language === 'en' ? 'Subject' : '主体', defaultValue: language === 'en' ? 'a small blue bird' : '一只蓝色小鸟', options: [], note: null, required: true }] });
const input = () => ({ version: 1, observedAt: '2026-10-15T00:00:00Z', source: 'https://tryqueenie.com', records: [{ id: 'queenie-test', slug: 'queenie-test', author: 'Image author', sourceUrl: 'https://example.com/original', queenieUrl: 'https://tryqueenie.com/hits/test', sourceUpdatedAt: '2026-10-03T00:00:00Z', media: [{ src: 'https://s3.tryqueenie.com/queenie-prod-public/hits/test/0-abcd.jpg', width: 600, height: 800, sha256: 'a'.repeat(64) }], taxonomy: [{ axis: 'useCase', slug: 'editorial-covers', labels: { en: 'Editorial covers', 'zh-CN': '文章封面' } }], copy: { en: copy('en'), 'zh-CN': copy('zh-CN') } }], exclusions: [] });

describe('Queenie image projection', () => {
 it('preserves baseline records and projects bilingual references, variables and real counts', () => {
  for (const locale of ['en','zh-CN'] as const) {
   const base={...createFixtureCatalog('zh-CN'),locale}, c=appendQueenieCatalog(base,readQueenieDataset(input()));
   expect(c.prompts.slice(0,base.prompts.length)).toEqual(base.prompts);
   const p=c.prompts.at(-1)!;
   expect(p.href).toBe(`/${locale}/prompts/queenie-test`);
   expect(p.language).toBe(locale);expect(p.reconstruction).toBe(true);expect(p.editableTemplate).toBe(true);
   expect(p.models).toEqual([]);expect(p.likes).toBeNull();expect(p.creatorRef).toBeNull();
   expect(p.variables[0]!.defaultValue).toBe(copy(locale).variables[0]!.defaultValue);
   expect(p.useCases[0]!.count).toBe(1);expect(c.useCases.find(x=>x.slug==='editorial-covers')?.count).toBe(1);
   expect(p.localeVariants).toHaveLength(2);expect(p.seo.robots).toBe('noindex,nofollow');
  }
 });
 it('rejects duplicate identity, unsafe sources, untrusted image URLs and missing bilingual values', () => {
  const duplicate=input();duplicate.records.push(duplicate.records[0]!);expect(()=>readQueenieDataset(duplicate)).toThrow(/Duplicate/);
  const bad=input();bad.records[0]!.sourceUrl='javascript:alert(1)';expect(()=>readQueenieDataset(bad)).toThrow(/URL/);
  const image=input();image.records[0]!.media[0]!.src='https://evil.example/0.jpg';expect(()=>readQueenieDataset(image)).toThrow(/media/);
  const empty=input();empty.records[0]!.copy.en.prompt='';expect(()=>readQueenieDataset(empty)).toThrow();
  const translated=input();translated.records[0]!.copy['zh-CN'].variables[0]!.token='[WRONG]';expect(()=>readQueenieDataset(translated)).toThrow(/placeholder/);
 });
 it('rejects colliding routes and conflicting taxonomy identities instead of shadowing existing data', () => {
  const base=createFixtureCatalog('zh-CN'), d=readQueenieDataset(input());d.records[0]!.slug=base.prompts[0]!.slug;
  expect(()=>appendQueenieCatalog(base,d)).toThrow(/Duplicate/);
 });
});

import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { catalogPaths } from '@/site/routes';
import { placeholderTokens } from '@/lib/catalog/placeholders';
import { promptLanguage } from '@/lib/i18n/text';
it('makes every admitted Queenie image study reachable through the image library and real task/style routes', () => {
 for (const locale of ['en','zh-CN'] as const) {
  const c=createGitBetaCatalog(locale), rows=c.prompts.filter(p=>p.reconstruction), paths=new Set(catalogPaths(c));
  expect(rows).toHaveLength(1306);expect(rows.reduce((n,p)=>n+p.media.length,0)).toBe(3321);
  expect(c.prompts.filter(p=>p.kind==='image')).toHaveLength(1849);
  for(const p of rows){
   expect(paths.has(p.href)).toBe(true);expect(p.models).toEqual([]);expect(p.creatorRef).toBeNull();
   expect(p.variables.map(v=>v.token).sort()).toEqual(placeholderTokens(p.prompt).sort());
   expect(p.variables.every(v=>v.defaultValue.trim() && !v.defaultValue.includes(v.token))).toBe(true);
   expect([...p.useCases,...p.styles].every(r=>paths.has(r.href))).toBe(true);
   expect(p.source.url.startsWith('https://')).toBe(true);expect(p.language).toBe(locale);
  }
  expect(promptLanguage(locale,rows[0]!)).toContain(locale==='en'?'reconstruction':'逆向');
 }
});

it('does not invent headline text for text-free article covers and corrects the audited subject viewpoint', () => {
 for(const locale of ['en','zh-CN'] as const){
  const c=createGitBetaCatalog(locale), p=c.prompts.find(p=>p.slug==='queenie-the-day-i-gave-up-my-corporate-promotion-xhud3l')!;
  expect(p.variables.some(v=>v.token==='[HEADLINE]')).toBe(false);
  expect(p.variables.find(v=>v.token==='[SUBJECT]')?.defaultValue).toContain(locale==='en'?'front-facing':'正面');
  expect(p.prompt).not.toContain('[HEADLINE]');
 }
});

import { isPromptCreator } from '@/lib/catalog/creator-match';
import { taskFindings } from '@/lib/catalog/task-findings';
it('keeps image credit separate from prompt authorship and renders reference findings',()=>{
 const p=createGitBetaCatalog('en').prompts.find(p=>p.reconstruction)!;
 expect(isPromptCreator({...p,handle:'@example'}, {id:'example',slug:'example',handle:'@example'})).toBe(false);
 const findings=taskFindings([p]).findings;
 expect(findings.some(f=>f.key==='reference')).toBe(true);expect(findings.some(f=>f.key==='author')).toBe(false);
});
