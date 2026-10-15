import { placeholderTokens } from './placeholders';
import { filterHref, taskHref, styleHref } from './query';
import type { Axis, Catalog, Locale, Prompt, Ref, Variable } from './types';

type Copy = { title: string; summary: string; prompt: string; variables: Variable[] };
type Taxon = { axis: 'useCase' | 'style' | 'subject'; slug: string; labels: Record<Locale,string> };
type Image = { src: string; width: number; height: number; sha256: string };
export type QueenieRecord = { id: string; slug: string; author: string; sourceUrl: string; queenieUrl: string; sourceUpdatedAt: string; media: Image[]; taxonomy: Taxon[]; copy: Record<Locale,Copy> };
export type QueenieDataset = { version: number; observedAt: string; source: string; records: QueenieRecord[]; exclusions: { slug: string; reason: string }[] };
const locales = ['zh-CN','en'] as const;
const fields = { model:'models',useCase:'useCases',style:'styles',subject:'subjects',technique:'techniques' } as const;
function obj(value: unknown): Record<string,unknown> { if (!value || typeof value!=='object' || Array.isArray(value)) throw Error('Queenie object required'); return value as Record<string,unknown>; }
function str(value: unknown): string { if(typeof value!=='string' || !value.trim())throw Error('Queenie nonempty string required');return value; }
function list(value: unknown): unknown[] { if(!Array.isArray(value))throw Error('Queenie array required');return value; }
function url(value: unknown): string { const u=new URL(str(value));if(u.protocol!=='https:'||u.username||u.password)throw Error('Queenie unsafe URL');return u.href; }
function slug(value: unknown): string { const s=str(value);if(!/^[a-z0-9][a-z0-9-]*$/.test(s))throw Error('Queenie invalid slug');return s; }
function date(value: unknown): string {const s=str(value);if(!Number.isFinite(Date.parse(s)))throw Error('Queenie invalid date');return s;}
function image(value: unknown): Image {
 const v=obj(value), src=url(v.src), u=new URL(src), hash=str(v.sha256);
 if(u.origin!=='https://s3.tryqueenie.com'||!/^\/queenie-prod-public\/hits\/[a-z0-9-]+\/[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp)$/.test(u.pathname)||u.search||u.hash)throw Error('Queenie untrusted media URL');
 if(!/^[a-f0-9]{64}$/.test(hash)||typeof v.width!=='number'||!Number.isSafeInteger(v.width)||v.width<1||typeof v.height!=='number'||!Number.isSafeInteger(v.height)||v.height<1)throw Error('Queenie invalid media checksum/dimensions');
 return {src,width:v.width,height:v.height,sha256:hash};
}
function copy(value: unknown): Copy {
 const v=obj(value), prompt=str(v.prompt), tokens=placeholderTokens(prompt);
 const variables=list(v.variables).map(value=>{const x=obj(value);return {token:str(x.token),label:str(x.label),defaultValue:str(x.defaultValue),options:list(x.options).map(str),note:x.note===null?null:str(x.note),required:true};});
 if(!tokens.length||new Set(variables.map(x=>x.token)).size!==variables.length||JSON.stringify(tokens.slice().sort())!==JSON.stringify(variables.map(x=>x.token).sort()))throw Error('Queenie inconsistent placeholders');
 return {title:str(v.title),summary:str(v.summary),prompt,variables};
}
export function readQueenieDataset(value: unknown): QueenieDataset {
 const v=obj(value);if(v.version!==1||url(v.source)!=='https://tryqueenie.com/')throw Error('Queenie snapshot contract required');
 const ids=new Set<string>(), slugs=new Set<string>(), taxonomy=new Map<string,string>();
 const records=list(v.records).map(value=>{
  const x=obj(value), id=slug(x.id), key=slug(x.slug);if(ids.has(id)||slugs.has(key))throw Error('Duplicate Queenie identity');ids.add(id);slugs.add(key);
  const translations=obj(x.copy), en=copy(translations.en), zh=copy(translations['zh-CN']);
  if(JSON.stringify(en.variables.map(x=>x.token))!==JSON.stringify(zh.variables.map(x=>x.token)))throw Error('Queenie bilingual placeholder mismatch');
  const taxa=list(x.taxonomy).map(value=>{const t=obj(value), axis=t.axis;if(axis!=='useCase'&&axis!=='style'&&axis!=='subject')throw Error('Queenie invalid taxonomy axis');
   const labels=obj(t.labels), term:Taxon={axis,slug:slug(t.slug),labels:{en:str(labels.en),'zh-CN':str(labels['zh-CN'])}};const id=axis+':'+term.slug, signature=JSON.stringify(term.labels);
   if(taxonomy.has(id)&&taxonomy.get(id)!==signature)throw Error('Queenie conflicting taxonomy');taxonomy.set(id,signature);return term;});
  const media=list(x.media).map(image);if(!media.length||new Set(media.map(x=>x.src)).size!==media.length)throw Error('Queenie real unique media required');
  return {id,slug:key,author:str(x.author),sourceUrl:url(x.sourceUrl),queenieUrl:url(x.queenieUrl),sourceUpdatedAt:date(x.sourceUpdatedAt),media,taxonomy:taxa,copy:{en,'zh-CN':zh}};
 });
 return {version:1,source:url(v.source),observedAt:date(v.observedAt),records,exclusions:list(v.exclusions).map(value=>{const x=obj(value);return {slug:str(x.slug),reason:str(x.reason)};})};
}

/** Owner-authorized public image studies. No models, engagement or original-prompt authorship inferred. */
export function appendQueenieCatalog(base: Catalog, dataset: QueenieDataset): Catalog {
 const locale=base.locale, registries:Record<Axis,Map<string,Ref>>={model:new Map(),useCase:new Map(),style:new Map(),subject:new Map(),technique:new Map()};
 for(const axis of Object.keys(fields) as Axis[])for(const ref of base[fields[axis]])registries[axis].set(ref.slug,{...ref});
 const ids=new Set(base.prompts.map(x=>x.id)), slugs=new Set(base.prompts.map(x=>x.slug));
 const additions:Prompt[]=dataset.records.map(row=>{
  if(ids.has(row.id)||slugs.has(row.slug))throw Error('Duplicate Queenie catalog identity');ids.add(row.id);slugs.add(row.slug);
  const refs=(axis:Taxon['axis'])=>row.taxonomy.filter(t=>t.axis===axis).map(term=>{
   const found=registries[axis].get(term.slug);if(found)return {...found,href:axis==='useCase'?taskHref(locale,term.slug):axis==='style'?styleHref(locale,term.slug):found.href};
   const ref:Ref={id:`queenie-${axis}-${term.slug}`,slug:term.slug,label:term.labels[locale],sourceLabel:term.labels.en,searchLabels:locales.map(l=>term.labels[l]),href:axis==='useCase'?taskHref(locale,term.slug):axis==='style'?styleHref(locale,term.slug):filterHref(locale,axis,term.slug),count:0};registries[axis].set(term.slug,ref);return ref;
  });
  const cover=row.media[0];if(!cover)throw Error('Queenie media required');
  const c=row.copy[locale], href=`/${locale}/prompts/${row.slug}`;
  return {id:row.id,slug:row.slug,href,locale,title:c.title,summary:c.summary,prompt:c.prompt,language:locale,reconstruction:true,editableTemplate:true,searchLabels:locales.flatMap(l=>[row.copy[l].title,row.copy[l].summary,row.copy[l].prompt]),kind:'image',models:[],useCases:refs('useCase'),styles:refs('style'),subjects:refs('subject'),techniques:[],handle:row.author,creatorRef:null,img:cover.src,media:row.media.map((m,i)=>({id:`${row.id}-image-${i}`,kind:'image',src:m.src,alt:c.title,width:m.width,height:m.height,poster:null,label:null})),likes:null,saves:null,views:null,highValue:false,score:null,publishedAt:null,variables:c.variables,steps:[],requiredInputs:[],optionalInputs:[],parameters:[],source:{url:row.sourceUrl,platform:new URL(row.sourceUrl).hostname.replace(/^www\./,''),observedAt:dataset.observedAt},evidence:[{type:locale==='en'?'Queenie image analysis':'Queenie 图片拆解',url:row.queenieUrl,confidence:null}],actions:{canCopy:true,tryUrl:null},localeVariants:locales.map(l=>({locale:l,slug:row.slug,href:`/${l}/prompts/${row.slug}`})),seo:{title:c.title,description:c.summary.slice(0,240),canonicalUrl:null,robots:'noindex,nofollow',hreflang:{}},revision:base.revision,appearsOn:['l1','l2','l3','l4'],featuredOn:[]};
 });
 const prompts=[...base.prompts,...additions];
 for(const axis of Object.keys(fields) as Axis[])for(const ref of registries[axis].values())ref.count=prompts.filter(p=>p[fields[axis]].some(r=>r.slug===ref.slug)).length;
 return {...base,prompts,models:[...registries.model.values()],useCases:[...registries.useCase.values()],styles:[...registries.style.values()],subjects:[...registries.subject.values()],techniques:[...registries.technique.values()]};
}
