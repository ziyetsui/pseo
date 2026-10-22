import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {parse} from 'node-html-parser';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {websiteEntries} from '@/lib/catalog/website';
import {websiteViews} from '@/lib/catalog/website-views';
import {catalogPaths} from '@/site/routes';
import {switchLocaleHref} from '@/lib/i18n/routes';
import {LanguageSwitch} from '@/components/LanguageSwitch';
import {SiteHeader,SiteFooter} from '@/components/Chrome';
import {Hub} from '@/components/Hub';
import {LibraryIndex} from '@/components/LibraryIndex';
const zh=createGitBetaCatalog('zh-CN'),en=createGitBetaCatalog('en');
describe('explicit bilingual library',()=>{
 it('projects identical source identities, graph memberships and exact prompt bodies to both locale paths',()=>{
  expect(zh.revision).toBe(en.revision);
  expect(en.prompts.map(p=>[p.id,p.prompt,p.source,p.language])).toEqual(zh.prompts.map(p=>[p.id,p.prompt,p.source,p.language]));
  expect(websiteEntries(en).map(p=>p.id)).toEqual(websiteEntries(zh).map(p=>p.id));
  const membership=(c:typeof zh)=>websiteViews(c).map(view=>[view.id,[...view.caseIds].sort()]).sort();expect(membership(en)).toEqual(membership(zh));
  expect(new Set(catalogPaths(en))).toEqual(new Set(catalogPaths(zh).map(path=>switchLocaleHref(path,'en'))));
  for(const prompt of en.prompts)expect(prompt.localeVariants.map(v=>v.locale)).toEqual(['zh-CN','en']);
  expect(en.prompts.every(p=>p.href.startsWith('/en/'))).toBe(true);
 });
 it('preserves route, query and fragment without rewriting external sources',()=>{
  expect(switchLocaleHref('/zh-CN/prompts/website/views/tool/three-js?q=pool&model=claude#toc','en')).toBe('/en/prompts/website/views/tool/three-js?q=pool&model=claude#toc');
  expect(()=>switchLocaleHref('https://x.com/test','en')).toThrow();
  const picker=parse(renderToStaticMarkup(<LanguageSwitch locale="zh-CN" href="/zh-CN/prompts/image" />));
  expect(picker.querySelector('summary')?.text).toContain('Language');
  expect(picker.querySelector('a[aria-current="page"]')?.text).toContain('中文');
  expect(picker.querySelectorAll('a')).toHaveLength(2);
  const link=picker.querySelector('a[hreflang="en"]')!;
  expect(link.getAttribute('href')).toBe('/en/prompts/image');expect(link.getAttribute('hreflang')).toBe('en');
 });
 it('server-renders Chinese and English interface copy with genuine same-page language links',()=>{
  for(const [catalog,title,images,library] of [[zh,'提示词库','图片','提示词库目录'],[en,'Prompt Library','Images','Library index']] as const){
   const header=parse(renderToStaticMarkup(<SiteHeader level="deck" locale={catalog.locale} bilingual currentHref={`/${catalog.locale}/prompts/image`} />));
   expect(header.text).toContain(title);expect(header.text).toContain(images);
   expect(header.querySelector('[data-language-switch]')?.getAttribute('href')).toBe(`/${catalog.locale==='en'?'zh-CN':'en'}/prompts/image`);
   expect(parse(renderToStaticMarkup(<LibraryIndex catalog={catalog} />)).querySelector('h1')?.text).toBe(library);
   const footer=parse(renderToStaticMarkup(<SiteFooter catalog={catalog} />));
   expect(footer.querySelectorAll('a[href]').filter(a=>a.getAttribute('href')?.startsWith('/en/')||a.getAttribute('href')?.startsWith('/zh-CN/')).every(a=>a.getAttribute('href')!.startsWith(`/${catalog.locale}/`))).toBe(true);
  }
  expect(parse(renderToStaticMarkup(<Hub catalog={zh} />)).querySelector('h1')?.text).not.toMatch(/[a-z]/i);
  expect(parse(renderToStaticMarkup(<Hub catalog={en} />)).querySelector('h1')?.text).not.toMatch(/[\u3400-\u9fff]/u);
 });
});
it('preserves the ability to search original taxonomy names after translating display labels',async()=>{
 const {filterPrompts}=await import('@/lib/catalog/query');
 const ref=zh.useCases.find(ref=>ref.sourceLabel==='Posters & Typography')!;
 expect(ref.label).toBe('海报与排版');
 for(const q of ['Posters & Typography','海报与排版'])expect(filterPrompts(zh,{q}).map(p=>p.id)).toEqual(filterPrompts(en,{q}).map(p=>p.id));
});
