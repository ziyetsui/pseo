import type {Catalog,Locale,Prompt} from './types';

type StudyCopy={title:string;summary:string;prompt:string;modelNote:string};
type StudyMedia={src:string;width:number;height:number;sha256:string};
export type ReferenceStudy={id:string;slug:string;author:string;sourceUrl:string;observedAt:string;originalModel:null;reproductionModel:string;state:'draft';rightsStatus:'review_required';media:StudyMedia[];copy:Record<Locale,StudyCopy>;useCases:string[];styles:string[]};
export type ReferenceStudies={version:1;records:ReferenceStudy[]};
const locales=['zh-CN','en'] as const;
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Reference study object required');return v as Record<string,unknown>;}
function text(v:unknown):string{if(typeof v!=='string'||!v.trim())throw Error('Reference study text required');return v;}
function list(v:unknown):unknown[]{if(!Array.isArray(v))throw Error('Reference study list required');return v;}
function tokens(v:string){return [...new Set(v.match(/\[[A-Z][A-Z0-9_]*\]/g)??[])];}
export function readReferenceStudies(value:unknown):ReferenceStudies{
 const input=object(value);if(input.version!==1)throw Error('Reference study version required');
 const identities=new Set<string>();
 const records=list(input.records).map(value=>{
  const row=object(value),id=text(row.id),slug=text(row.slug),author=text(row.author),sourceUrl=text(row.sourceUrl),source=new URL(sourceUrl);
  if(!/^study-[a-z0-9-]+$/.test(id)||!/^study-[a-z0-9-]+$/.test(slug)||identities.has(id)||identities.has(slug))throw Error('Reference study identity invalid');
  identities.add(id);identities.add(slug);
  if(!/^@[A-Za-z0-9_.]+$/.test(author)||source.origin!=='https://www.tiktok.com'||source.pathname.match(/^\/(@[A-Za-z0-9_.]+)\/photo\/\d+$/)?.[1]!==author||source.search||source.hash||source.username||source.password)throw Error('Reference study source identity mismatch');
  if(id!==`study-${author.slice(1)}-${source.pathname.split('/').at(-1)}`)throw Error('Reference study immutable identity mismatch');
  if(row.state!=='draft'||row.rightsStatus!=='review_required'||row.originalModel!==null||row.reproductionModel!=='gpt-image-2')throw Error('Reference study provenance invalid');
  const observedAt=text(row.observedAt);if(!Number.isFinite(Date.parse(observedAt)))throw Error('Reference study observation date invalid');
  const seenMedia=new Set<string>(),media=list(row.media).map((value,index)=>{
   const item=object(value),src=text(item.src),sha256=text(item.sha256);
   if(!new RegExp(`^/reference-studies/${slug}/[0-9]{2}\\.jpg$`).test(src)||seenMedia.has(src)||!/^\w{64}$/.test(sha256)||!/^[a-f0-9]+$/.test(sha256)||!Number.isSafeInteger(item.width)||!Number.isSafeInteger(item.height)||(item.width as number)<1||(item.height as number)<1)throw Error('Reference study media invalid');
   if(src!==`/reference-studies/${slug}/${String(index+1).padStart(2,'0')}.jpg`)throw Error('Reference study slide order invalid');
   seenMedia.add(src);return {src,sha256,width:item.width as number,height:item.height as number};
  });if(!media.length)throw Error('Reference study media required');
  const translations=object(row.copy),copy={} as Record<Locale,StudyCopy>;
  for(const locale of locales){const v=object(translations[locale]);copy[locale]={title:text(v.title),summary:text(v.summary),prompt:text(v.prompt),modelNote:text(v.modelNote)};if(!tokens(copy[locale].prompt).length)throw Error('Reference study placeholders required');}
  if(JSON.stringify(tokens(copy.en.prompt).sort())!==JSON.stringify(tokens(copy['zh-CN'].prompt).sort()))throw Error('Reference study bilingual placeholders mismatch');
  return {id,slug,author,sourceUrl,observedAt,originalModel:null,reproductionModel:'gpt-image-2',state:'draft',rightsStatus:'review_required',media,copy,useCases:list(row.useCases).map(text),styles:list(row.styles).map(text)} as ReferenceStudy;
 });return {version:1,records};
}
/** Explicit owner-authorized beta reference studies; source model and prompt remain unknown. */
export function appendReferenceStudies(base:Catalog,dataset:ReferenceStudies):Catalog{
 if(base.mode!=='git-beta')return base;
 const registry=(axis:'models'|'useCases'|'styles',slugs:string[])=>slugs.map(slug=>{const ref=base[axis].find(r=>r.slug===slug);if(!ref)throw Error(`Reference study unknown ${axis}: ${slug}`);return {...ref};});
 const additions:Prompt[]=dataset.records.map(row=>{
  if(base.prompts.some(p=>p.id===row.id||p.slug===row.slug))throw Error('Duplicate reference study catalog identity');
  const cover=row.media[0];if(!cover)throw Error('Reference study media required');
  const c=row.copy[base.locale],href=`/${base.locale}/prompts/${row.slug}`;
  return {id:row.id,slug:row.slug,href,locale:base.locale,title:c.title,summary:c.summary,prompt:c.prompt,language:base.locale,reconstruction:true,editableTemplate:true,searchLabels:locales.flatMap(l=>[row.copy[l].title,row.copy[l].summary,row.copy[l].prompt]),kind:'image',models:registry('models',[row.reproductionModel]),useCases:registry('useCases',row.useCases),styles:registry('styles',row.styles),subjects:[],techniques:[],handle:row.author,creatorRef:null,img:cover.src,media:row.media.map((m,i)=>({id:`${row.id}-image-${i+1}`,kind:'image',src:m.src,width:m.width,height:m.height,alt:`${c.title} · ${i+1}/${row.media.length}`,label:null,poster:null})),likes:null,saves:null,views:null,highValue:false,score:null,publishedAt:null,variables:tokens(c.prompt).sort().map(token=>({token,label:token.slice(1,-1).replaceAll('_',' '),defaultValue:'',options:[],note:null,required:false})),steps:[],requiredInputs:[],optionalInputs:[],parameters:[{label:base.locale==='en'?'Reproduction model':'复现模型',value:c.modelNote}],source:{url:row.sourceUrl,platform:'TikTok',observedAt:row.observedAt},evidence:[{type:base.locale==='en'?'Public reference image study':'公开参考图拆解',url:row.sourceUrl,confidence:null}],actions:{canCopy:true,tryUrl:null},localeVariants:locales.map(locale=>({locale,slug:row.slug,href:`/${locale}/prompts/${row.slug}`})),seo:{title:c.title,description:c.summary,canonicalUrl:null,robots:'noindex,nofollow',hreflang:{}},revision:base.revision,appearsOn:['l1','l2','l3','l4'],featuredOn:[]};
 });
 const prompts=[...base.prompts,...additions],counts=(axis:'models'|'useCases'|'styles')=>base[axis].map(r=>({...r,count:prompts.filter(p=>p[axis].some(ref=>ref.slug===r.slug)).length}));
 return {...base,prompts,models:counts('models'),useCases:counts('useCases'),styles:counts('styles')};
}
