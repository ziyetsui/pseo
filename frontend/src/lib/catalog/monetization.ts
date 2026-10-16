import taxonomy from '@/data/monetization-taxonomy.json';
import membership from '@/data/monetization-membership.json';
import audit from '@/data/monetization-audit.json';
import {websiteEntries} from './website';
import {websiteEditableTemplate} from './website-templates';
import type {Catalog,Locale} from './types';

type Copy=Record<Locale,string>;
type GroupDefinition={id:string;slug:string;labels:Copy;descriptions:Copy};
type SceneDefinition=GroupDefinition&{groupId:string};
type Taxonomy={version:number;groups:GroupDefinition[];scenarios:SceneDefinition[]};
type Edge={contentId:string;scenarioId:string;fit:string;evidence:{field:string;quote:string;reason:string};notes:Copy;sourceRevision:string};
type Membership={version:number;revision:string;edges:Edge[]};
type Audit={version:number;revision:string;records:{contentId:string;status:string;reason:string;scenarioIds:string[]}[]};
export type MonetizationRef={id:string;slug:string;label:string;description:string;href:string;count:number;cover:string;groupId?:string};
export type MonetizationEntry={id:string;key:string;title:string;summary:string;href:string;cover:string;kind:string;models:{slug:string;label:string}[];sourceUrl:string;prompt:string;language:string;attribution:string;reconstruction:boolean;siteAuthored:boolean;fit:'direct'|'adaptable';notes:string};
const root=(c:Catalog)=>`/${c.locale}/prompts/monetization`;
function contents(c:Catalog){
 const rows=new Map<string,MonetizationEntry>();const aliases=new Map<string,string>();
 for(const p of c.prompts)rows.set(p.id,{id:p.id,key:p.id,title:p.title,summary:p.summary,href:p.href,cover:p.img??'',kind:p.kind,models:p.models.map(m=>({slug:m.slug,label:m.label})),sourceUrl:p.source.url,prompt:p.prompt,language:p.language,attribution:p.handle,reconstruction:!!p.reconstruction,siteAuthored:false,fit:'direct',notes:''});
 const byHref=new Map(c.prompts.map(p=>[p.href,p.id]));
 for(const w of websiteEntries(c)){
  const key=w.promptHref&&byHref.get(w.promptHref)||w.id;aliases.set(w.id,key);
  const template=websiteEditableTemplate(c,w);
  rows.set(key,{id:w.id,key,title:w.title,summary:w.summary,href:w.href,cover:w.cover,kind:'website',models:w.models.map(m=>({slug:m.slug,label:m.label})),sourceUrl:w.source.url,prompt:template.prompt,language:template.language,attribution:w.attribution,reconstruction:false,siteAuthored:template.origin==='site-authored',fit:'direct',notes:''});
 }
 return {rows,aliases};
}
export function validateMonetization(c:Catalog,t:Taxonomy,m:Membership,a:Audit){
 if(t.version!==1||m.version!==1||a.version!==1||m.revision!==c.revision||a.revision!==c.revision)throw Error('Stale monetization source revision');
 const {rows}=contents(c);const groupIds=new Set(t.groups.map(g=>g.id)),sceneIds=new Set(t.scenarios.map(s=>s.id));
 if(groupIds.size!==t.groups.length||sceneIds.size!==t.scenarios.length)throw Error('Duplicate monetization ID');
 for(const list of [t.groups,t.scenarios]){
  if(new Set(list.map(x=>x.slug)).size!==list.length)throw Error('Duplicate monetization slug');
  for(const x of list)if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug)||!x.labels.en||!x.labels['zh-CN']||!x.descriptions.en||!x.descriptions['zh-CN'])throw Error('Incomplete monetization definition');
 }
 for(const s of t.scenarios)if(!groupIds.has(s.groupId))throw Error('Dangling monetization parent');
 const keys=new Set<string>();const linked=new Map<string,Set<string>>();
 for(const e of m.edges){
  const key=e.contentId+':'+e.scenarioId;
  if(!rows.has(e.contentId)||!sceneIds.has(e.scenarioId)||keys.has(key)||e.sourceRevision!==c.revision)throw Error('Invalid or duplicate monetization edge');
  if(!['direct','adaptable'].includes(e.fit)||!e.evidence.field||!e.evidence.quote||!e.evidence.reason||e.fit==='adaptable'&&(!e.notes.en||!e.notes['zh-CN']))throw Error('Missing monetization evidence or adaptation notes');
  keys.add(key);const values=linked.get(e.contentId)??new Set<string>();values.add(e.scenarioId);linked.set(e.contentId,values);
 }
 const audited=new Set<string>();
 for(const r of a.records){
  if(!rows.has(r.contentId)||audited.has(r.contentId)||!['mapped','unrelated','review'].includes(r.status)||!r.reason)throw Error('Invalid monetization audit');
  const actual=linked.get(r.contentId)??new Set();
  if(new Set(r.scenarioIds).size!==r.scenarioIds.length||actual.size!==r.scenarioIds.length||r.scenarioIds.some(id=>!actual.has(id))||(r.status==='mapped')!==(actual.size>0))throw Error('Audit and monetization members disagree');
  audited.add(r.contentId);
 }
 if(audited.size!==rows.size)throw Error('Incomplete monetization audit coverage');
}
type Index={groups:MonetizationRef[];scenarios:MonetizationRef[];byScene:Map<string,MonetizationEntry[]>;rows:Map<string,MonetizationEntry>;aliases:Map<string,string>};
const cache=new Map<string,Index>();
function index(c:Catalog):Index{
 if(c.mode!=='git-beta')return {groups:[],scenarios:[],byScene:new Map(),rows:new Map(),aliases:new Map()};
 const key=`${c.locale}:${c.revision}`;const existing=cache.get(key);if(existing)return existing;
 validateMonetization(c,taxonomy,membership,audit);
 const {rows,aliases}=contents(c);const byScene=new Map<string,MonetizationEntry[]>();
 for(const e of membership.edges){const values=byScene.get(e.scenarioId)??[];values.push({...rows.get(e.contentId)!,fit:e.fit as 'direct'|'adaptable',notes:e.notes[c.locale]});byScene.set(e.scenarioId,values);}
 const definition=(d:GroupDefinition,href:string,members:MonetizationEntry[]):MonetizationRef=>({id:d.id,slug:d.slug,label:d.labels[c.locale],description:d.descriptions[c.locale],href,count:new Set(members.map(e=>e.key)).size,cover:members.find(e=>e.cover)?.cover??''});
 const scenarios=taxonomy.scenarios.flatMap(s=>{const members=byScene.get(s.id)??[],g=taxonomy.groups.find(g=>g.id===s.groupId)!;return members.length?[{...definition(s,`${root(c)}/${g.slug}/${s.slug}`,members),groupId:s.groupId}]:[];});
 const groups=taxonomy.groups.flatMap(g=>{const ids=new Set(scenarios.filter(s=>s.groupId===g.id).flatMap(s=>(byScene.get(s.id)??[]).map(e=>e.key)));return ids.size?[definition(g,`${root(c)}/${g.slug}`,[...ids].map(id=>rows.get(id)!))]:[];});
 const result={groups,scenarios,byScene,rows,aliases};cache.set(key,result);return result;
}
export function monetizationGroups(c:Catalog){return index(c).groups;}
export function monetizationScenarios(c:Catalog,groupSlug?:string){const i=index(c);if(!groupSlug)return i.scenarios;const g=i.groups.find(g=>g.slug===groupSlug);return g?i.scenarios.filter(s=>s.groupId===g.id):[];}
export function monetizationEntries(c:Catalog,scenarioId?:string){const i=index(c);if(scenarioId)return i.byScene.get(scenarioId)??[];return [...new Map([...i.byScene.values()].flat().map(e=>[e.key,e])).values()];}
export function monetizationForContent(c:Catalog,contentId:string){const i=index(c),key=i.aliases.get(contentId)??contentId;return i.scenarios.filter(s=>i.byScene.get(s.id)?.some(e=>e.key===key));}
export function monetizationFit(c:Catalog,scenarioId:string,contentId:string){const i=index(c),key=i.aliases.get(contentId)??contentId;return i.byScene.get(scenarioId)?.find(e=>e.key===key);}
export function monetizationPaths(c:Catalog){const i=index(c);return i.groups.length?[root(c),...i.groups.map(g=>g.href),...i.scenarios.map(s=>s.href)]:[];}
export function monetizationPage(c:Catalog,path:string){if(!monetizationPaths(c).includes(path))return null;return {group:index(c).groups.find(g=>g.href===path),scenario:index(c).scenarios.find(s=>s.href===path)};}
