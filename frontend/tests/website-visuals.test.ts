import {expect,it} from 'vitest';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {websiteEntries} from '@/lib/catalog/website';
it.each(['en','zh-CN'] as const)('restores the parent-post Minecraft preview in %s',locale=>{
 const catalog=createGitBetaCatalog(locale);
 const entry=websiteEntries(catalog).find(row=>row.id==='prm_052f8b966b50591e744d11476eecafe6')!;
 expect(entry.cover).toMatch(/^\/website-previews\/\d+\.jpg$/);
 const prompt=catalog.prompts.find(row=>row.id===entry.id)!;
 expect(prompt.media.some(media=>media.kind==='video')).toBe(true);
 expect(prompt.source.url).toBe('https://x.com/painn_x/status/2108232717900841089');
});

import {readWebsiteVisualManifest,applyWebsiteVisuals} from '@/lib/catalog/website-visuals';
import input from '@/data/website-visuals.json';
import {gitBetaRevision} from '@/lib/catalog/git-beta-revision';
it('binds visual resources to catalog revision and rejects stale source bindings',()=>{
 const before=createGitBetaCatalog('en');const manifest=readWebsiteVisualManifest(input);
 const changed=structuredClone(manifest);changed.records[0]!.sourceUrl='https://x.com/wrong/status/1';
 expect(()=>applyWebsiteVisuals(before,changed)).toThrow(/Stale/);
 expect(gitBetaRevision('base',{},{},{},{},{},{},{},{},{},{},input)).not.toBe(gitBetaRevision('base',{},{},{},{},{},{},{},{},{},{},{}));
});
it('rejects missing media, duplicate records and external local-asset paths',()=>{
 const missing=structuredClone(input);missing.records[0]!.media=['999'];expect(()=>readWebsiteVisualManifest(missing)).toThrow();
 const duplicate=structuredClone(input);duplicate.records.push(duplicate.records[0]!);expect(()=>readWebsiteVisualManifest(duplicate)).toThrow(/record/);
 const unsafe=structuredClone(input);const first=Object.keys(unsafe.assets)[0]!;unsafe.assets[first as keyof typeof unsafe.assets]!.src='https://evil.example/asset.mp4';expect(()=>readWebsiteVisualManifest(unsafe)).toThrow(/local/);
});
it('preserves image prompts and source authorship outside the website collection',()=>{
 const catalog=createGitBetaCatalog('en');const image=catalog.prompts.find(p=>p.id==='queenie-1-mac-mini-1-agent-0-employees-this-is-how-you-build-the-fir-zxzsys')!;
 expect(image.handle).toBe('@MyWestLord');expect(image.source.url).toBe('https://x.com/MyWestLord/status/2063321372789465409');expect(image.media.every(m=>!m.src.startsWith('/website-'))).toBe(true);
 expect(websiteEntries(catalog)).toHaveLength(232);
});

it('keeps all long-video segments in order',()=>{
 const sequence=input.records.find(row=>row.media.some(id=>input.assets[id as keyof typeof input.assets]!.part!==null))!;
 expect(sequence).toBeDefined();
 const incomplete=structuredClone(input);const row=incomplete.records.find(row=>row.id===sequence.id)!;row.media.pop();expect(()=>readWebsiteVisualManifest(incomplete)).toThrow(/sequence/);
});
it.each(['en','zh-CN'] as const)('uses the supplied live demo screenshot and source link in %s',locale=>{
 const c=createGitBetaCatalog(locale),p=c.prompts.find(p=>p.id==='prm_db1952c7b46693da69677d1d5c144287')!;
 expect(p.img).toBe('/website-previews/209584968767264403899.png');
 expect(p.source.url).toBe('https://x.com/MiaAI_lab/status/2095849687672644038');
 expect(p.evidence.some(e=>e.url==='https://miaai-lab.github.io/Claude-Fable-5.1-Beautiful-HTML/')).toBe(true);
});
