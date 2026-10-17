import {describe,it,expect} from 'vitest';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {websiteEntries} from '@/lib/catalog/website';
import {websiteEditableTemplate} from '@/lib/catalog/website-templates';
import sourceRows from '../../docs/intake/2026-10-16-portfolio/source-records.json';
const importedIds=['prm_057b1ee7d4b4fcc1828565c083bbb0d7','prm_4a8109c2ab07cb35a7fc749d781d4648','prm_506b994c594f45c7de401e42d495d100','prm_b1b9b478fa7333680ae218c42e1e70bf','prm_c40f38e72fa902a647e00859ffd993f3','prm_c634a0454d9a96ac189676a31ab2d48c','prm_e69191dfe5f7e2ce6d4313f648b52a32','prm_f22bdd76c585224df1cb5f55f81ecc78'];
describe('source-backed portfolio publication',()=>{
 const en=createGitBetaCatalog('en'),zh=createGitBetaCatalog('zh-CN');
 for(const row of sourceRows)it(`preserves instructions, attribution, media and bilingual editing for ${row.id}`,()=>{
  const p=en.prompts.find(p=>p.source.url===row.post_url)!;expect(p).toBeDefined();
  expect(importedIds).toContain(p.id);expect(p.prompt).toBe(row.prompt);expect(p.kind).toBe('other');expect(p.seo.robots).toBe('noindex,nofollow');
  expect(p.handle.toLowerCase()).toBe('@'+row.author.toLowerCase());
  expect(p.media.length).toBeGreaterThan(0);expect(p.media.every(m=>m.kind==='video'&&m.src.startsWith('/website-videos/')&&m.poster?.startsWith('/website-previews/'))).toBe(true);
  if(row.post_url!==`https://x.com/${row.author}/status/${row.case_post_id}`)expect(p.evidence.some(e=>e.url?.endsWith('/'+row.case_post_id))).toBe(true);
  const q=zh.prompts.find(q=>q.id===p.id)!;expect(q.prompt).not.toBe(p.prompt);expect(q.originalPrompt).toBe(p.prompt);expect(q.title).toMatch(/\p{Script=Han}/u);
  const a=websiteEntries(en).find(e=>e.id===p.id)!,b=websiteEntries(zh).find(e=>e.id===p.id)!;
  expect(a.promptHref).toBe(p.href);const x=websiteEditableTemplate(en,a),y=websiteEditableTemplate(zh,b);
  expect(x.variables.length).toBeGreaterThan(0);expect(x.variables.map(v=>v.token)).toEqual(y.variables.map(v=>v.token));
  expect(en.creators.find(c=>c.id===p.creatorRef?.id)?.avatarUrl).toMatch(/^\/creator-avatars\//);
 });
 it('retains the existing scrolling-resume prompt without duplicating its source',()=>{
  const matches=en.prompts.filter(p=>p.source.url==='https://x.com/shushant_l/status/2062504736235159915');expect(matches).toHaveLength(1);expect(matches[0]!.id).toBe('prm_20506333c5687eff201784f5d424cb9f');
 });
 it('keeps both one-line prompts short and describes their limited published detail',()=>{
  for(const id of ['prm_4a8109c2ab07cb35a7fc749d781d4648','prm_506b994c594f45c7de401e42d495d100']){
   const p=en.prompts.find(p=>p.id===id)!;expect(p).toBeDefined();expect(p.prompt.length).toBeLessThan(100);expect(p.summary).toMatch(/one-line/);expect(p.summary).toMatch(/not published|No detailed/);
  }
 });
 it('does not infer Claude from an unsupported Fable/falbe model name',()=>{
  const p=en.prompts.find(p=>p.id==='prm_506b994c594f45c7de401e42d495d100')!;expect(p.models.map(m=>m.slug)).toEqual(['glm']);
 });
 it('retains separate source evidence for the design and build instructions',()=>{
  const p=en.prompts.find(p=>p.id==='prm_e69191dfe5f7e2ce6d4313f648b52a32')!;expect(p).toBeDefined();expect(p.prompt).toContain('Don’t build the website yet.');expect(p.prompt).toContain('Build the website using those choices.');expect(p.evidence.some(e=>e.url==='https://x.com/dammyayans/status/2110400428802191674')).toBe(true);
 });
});
