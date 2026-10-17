import {describe,it,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {createGitBetaCatalog} from '../src/lib/catalog/git-beta';
import {websiteEntries} from '../src/lib/catalog/website';
import {monetizationGroups,monetizationScenarios,monetizationEntries,monetizationForContent,validateMonetization} from '../src/lib/catalog/monetization';
import taxonomy from '../src/data/monetization-taxonomy.json';
import membership from '../src/data/monetization-membership.json';
import audit from '../src/data/monetization-audit.json';
const en=createGitBetaCatalog('en'),zh=createGitBetaCatalog('zh-CN');
describe('auditable monetization projection',()=>{
 it('keeps the complete beta catalog and exports its baseline for offline audit',()=>{
  expect(en.prompts).toHaveLength(2046);expect(websiteEntries(en)).toHaveLength(232);
  writeFileSync('/tmp/ancher-monetization-catalog.json',JSON.stringify({revision:en.revision,prompts:en.prompts,websites:websiteEntries(en),zhPrompts:zh.prompts,zhWebsites:websiteEntries(zh)}));
 });
 it('defines eight bilingual groups and forty unique scenarios',()=>{
  expect(taxonomy.groups).toHaveLength(8);expect(taxonomy.scenarios).toHaveLength(40);
  expect(new Set(taxonomy.scenarios.map(s=>s.id)).size).toBe(40);
  for(const s of taxonomy.scenarios){expect(s.labels.en).toBeTruthy();expect(s.labels['zh-CN']).toBeTruthy();expect(taxonomy.groups.some(g=>g.id===s.groupId)).toBe(true);}
 });
 it('validates every audited object and evidence-backed relation',()=>{
  expect(()=>validateMonetization(en,taxonomy,membership,audit)).not.toThrow();
  expect(audit.records.length).toBeGreaterThanOrEqual(2046);
  for(const edge of membership.edges){expect(edge.evidence.quote).toBeTruthy();if(edge.fit==='adaptable'){expect(edge.notes.en).toBeTruthy();expect(edge.notes['zh-CN']).toBeTruthy();}}
 });
 it('rejects dangling, duplicate and stale relations',()=>{
  const first=membership.edges[0]!;
  expect(()=>validateMonetization(en,taxonomy,{...membership,edges:[{...first,scenarioId:'absent'}]},audit)).toThrow();
  expect(()=>validateMonetization(en,taxonomy,{...membership,edges:[first,first]},audit)).toThrow();
  expect(()=>validateMonetization(en,taxonomy,{...membership,revision:'stale'},audit)).toThrow();
 });
 it('counts unique content rather than adding overlapping scene totals',()=>{
  for(const group of monetizationGroups(en)){
   const ids=new Set(monetizationScenarios(en,group.slug).flatMap(s=>monetizationEntries(en,s.id).map(e=>e.key)));
   expect(group.count).toBe(ids.size);
  }
  expect(new Set(monetizationEntries(en).map(e=>e.key)).size).toBe(monetizationEntries(en).length);
 });
 it('keeps language membership equal and connects details back to scenes',()=>{
  expect(monetizationGroups(en).map(g=>g.count)).toEqual(monetizationGroups(zh).map(g=>g.count));
  const scene=monetizationScenarios(en)[0]!,entry=monetizationEntries(en,scene.id)[0]!;
  expect(monetizationForContent(en,entry.id).some(s=>s.id===scene.id)).toBe(true);
  expect(monetizationEntries(en,scene.id).map(e=>e.key)).toEqual(monetizationEntries(zh,scene.id).map(e=>e.key));
 });
});
it('publishes only the completely reviewed advertising allowlist',()=>{
 const scene=monetizationScenarios(en).find(s=>s.slug==='ecommerce-advertising')!;const rows=monetizationEntries(en,scene.id);
 expect(rows).toHaveLength(33);
 for(const id of ['prm_943843acefd69e94e8ea552c5f0fbee8','prm_8a0b2e4bb11044aba212e95282a65f57','prm_f6fb70f281d2e96fc40baf22450a2f57'])expect(rows.some(e=>e.key===id)).toBe(false);
 expect(rows.find(e=>e.key==='prm_eee518243a4b25f519a07b6811a21bde')?.fit).toBe('adaptable');
});
