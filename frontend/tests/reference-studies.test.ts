import {describe,it,expect} from 'vitest';
import input from '@/data/reference-studies.json';
import {readReferenceStudies,appendReferenceStudies} from '@/lib/catalog/reference-studies';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {createFixtureCatalog} from '@/lib/catalog/fixture';
import {monetizationEntries,monetizationScenarios} from '@/lib/catalog/monetization';
import {catalogPaths} from '@/site/routes';
describe('owner-authorized TikTok reference study',()=>{
 it('preserves seven ordered local images, true source and bilingual reconstruction',()=>{
  for(const locale of ['en','zh-CN'] as const){
   const c=createGitBetaCatalog(locale),p=c.prompts.find(p=>p.id==='study-periciacards-7603866348644519190')!;
   expect(p).toBeDefined();expect(p.media).toHaveLength(7);expect(p.media.map(m=>m.src.split('/').at(-1))).toEqual(['01.jpg','02.jpg','03.jpg','04.jpg','05.jpg','06.jpg','07.jpg']);
   expect(p.source.url).toBe('https://www.tiktok.com/@periciacards/photo/7603866348644519190');
   expect(p.handle).toBe('@periciacards');expect(p.reconstruction).toBe(true);expect(p.originalPrompt).toBeUndefined();
   expect(p.models.map(m=>m.slug)).toEqual(['gpt-image-2']);expect(p.parameters.map(v=>v.value).join(' ')).toMatch(locale==='en'?/original model unknown/:/原作者模型未知/);
   expect(p.prompt).toContain('[TOPIC]');expect(p.language).toBe(locale);expect(p.views).toBeNull();
   expect(catalogPaths(c)).toContain(p.href);
   const scene=monetizationScenarios(c,'digital-products').find(s=>s.slug==='explainers')!;
   expect(monetizationEntries(c,scene.id).some(e=>e.id===p.id&&e.fit==='adaptable')).toBe(true);
  }
 });
 it('rejects identity drift, untrusted media, duplicate slides and invented model provenance',()=>{
  for(const mutate of [
   (x:{records:(Omit<(typeof input)['records'][number],'originalModel'>&{originalModel:string|null})[]})=>{x.records[0]!.sourceUrl='https://example.com/post';},
   (x:{records:(Omit<(typeof input)['records'][number],'originalModel'>&{originalModel:string|null})[]})=>{x.records[0]!.media.reverse();},
   (x:{records:(Omit<(typeof input)['records'][number],'originalModel'>&{originalModel:string|null})[]})=>{x.records[0]!.sourceUrl='https://www.tiktok.com/@periciacards/photo/1';},
   (x:{records:(Omit<(typeof input)['records'][number],'originalModel'>&{originalModel:string|null})[]})=>{x.records[0]!.media[0]!.src='/../../secret.jpg';},
   (x:{records:(Omit<(typeof input)['records'][number],'originalModel'>&{originalModel:string|null})[]})=>{x.records[0]!.media.push(x.records[0]!.media[0]!);},
   (x:{records:(Omit<(typeof input)['records'][number],'originalModel'>&{originalModel:string|null})[]})=>{x.records[0]!.originalModel='gpt-image-2';},
  ]){const x=structuredClone(input);mutate(x);expect(()=>readReferenceStudies(x)).toThrow();}
 });
 it('does not project reference studies into visual or public API catalogs',()=>{
  const base=createFixtureCatalog('zh-CN');expect(appendReferenceStudies(base,readReferenceStudies(input))).toBe(base);
  const publicBase={...base,mode:'public-api' as const};expect(appendReferenceStudies(publicBase,readReferenceStudies(input))).toBe(publicBase);
 });
});
