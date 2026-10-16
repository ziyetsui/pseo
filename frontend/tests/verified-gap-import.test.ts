import {describe,it,expect} from 'vitest';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {websiteEntries} from '@/lib/catalog/website';
import {websiteEditableTemplate} from '@/lib/catalog/website-templates';
import visuals from '@/data/website-visuals.json';
import mediaLinks from '../../docs/intake/2026-10-16-verified-gaps/media-links.json';
import caseLinks from '../../docs/intake/2026-10-16-verified-gaps/case-prompt-links.json';
import sourceRecords from '../../docs/intake/2026-10-16-verified-gaps/source-records.json';

describe('verified source gap publication',()=>{
 for(const locale of ['en','zh-CN'] as const) it(`preserves prompt provenance and binds the accepted media in ${locale}`,()=>{
  const catalog=createGitBetaCatalog(locale);
  for(const update of mediaLinks){
   const prompt=catalog.prompts.find(row=>row.id===update.id)!;
   expect(prompt,update.id).toBeDefined();
   expect(prompt.source.url).toBe(update.promptSource);
   expect(prompt.media.map(item=>Object.values(visuals.assets).find(a=>a.src===item.src)?.sourceUrl??item.src)).toEqual(expect.arrayContaining(update.media.map(item=>item.url)));
   if(update.mediaSource!==update.promptSource)expect(prompt.evidence.some(item=>item.url===update.mediaSource)).toBe(true);
  }
  expect(mediaLinks).toHaveLength(109);
  // The evidence review excluded course/advertising covers, rather than treating any attachment as an output.
  for(const id of ['prm_052f6c4a655687a66d47a1ec7c47f596','prm_bfcccfb27ca09d611eca08017cc430d4','prm_3f808154f2bc5f53428592a65c84d42b','prm_97f958b6be0d431e6d33143849f74460'])expect(catalog.prompts.find(row=>row.id===id)?.media).toHaveLength(0);
  for(const link of caseLinks){
   const entry=catalog.websites!.find(row=>row.id===link.caseId)!;
   const prompt=catalog.prompts.find(row=>row.id===link.promptId)!;
   expect(entry.promptHref).toBe(prompt.href);
   expect(websiteEditableTemplate(catalog,entry).variables.length).toBeGreaterThan(0);
   expect(websiteEntries(catalog).filter(row=>row.id===prompt.id)).toHaveLength(0);
  }
  for(const source of sourceRecords){
   const prompt=catalog.prompts.find(row=>row.source.url===source.post_url&&row.title!==source.title+' duplicate')!;
   expect(prompt).toBeDefined();
   expect(prompt.originalPrompt??prompt.prompt).toBe(source.prompt);
   expect(prompt.seo.robots).toBe('noindex,nofollow');
  }
  // A generic template from an article is not misrepresented as the fabric studio's actual project prompt.
  expect(catalog.websites!.find(row=>row.source.url.endsWith('/2103021164549312857'))?.promptHref).toBeNull();
 });
});
