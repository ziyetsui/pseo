import type { Catalog, Ref } from '@/lib/catalog/types';
import { styleHref, subjectHref, taskHref } from '@/lib/catalog/query';
import { modelFamilies } from '@/lib/catalog/model-families';
import { isPromptCreator } from '@/lib/catalog/creator-match';
import { websiteEntries } from '@/lib/catalog/website';
import { websiteViews } from '@/lib/catalog/website-views';

export interface NavigationEntry { id:string; label:string; href:string; count?:number; kind:'prompt'|'case'|'navigation' }
export interface NavigationGroup { id:string; title:string; entries:NavigationEntry[] }
const referenceOrder = {
  models:['Nano Banana','Higgsfield Soul','GPT Image','Kling','Seedance','Veo','Sora','Wan'],
  useCases:['Fashion','Beauty','Advertising','Food & beverage','Automotive','Web & motion','UGC','Product marketing'],
  styles:['Photorealistic','Cinematic','Luxury','Anime / illustrated','Retro / vintage','Sci-fi / cyberpunk','Surreal / fantasy'],
  subjects:['Person / portrait','Architecture / interior','Product','Food / drink','Vehicle'],
};
function ordered(values:Ref[],order:string[]) {
  const ranks=new Map(order.map((label,index)=>[label.toLowerCase(),index]));
  return [...values].sort((a,b)=>(ranks.get(a.label.toLowerCase())??100)-(ranks.get(b.label.toLowerCase())??100));
}
export function libraryNavigation(catalog:Catalog,level:'hub'|'deck'|'model'|'prompt'='hub'):NavigationGroup[] {
  const hub=`/${catalog.locale}/prompts`,models=modelFamilies(catalog).filter(model=>model.count>0);
  const populated=(values:Ref[],axis:'useCases'|'styles'|'subjects')=>values.map(ref=>({...ref,count:new Set(catalog.prompts.filter(prompt=>prompt[axis].some(term=>term.id===ref.id||term.slug===ref.slug)).map(prompt=>prompt.id)).size})).filter(ref=>ref.count>0);
  const entries=(values:Ref[],labels:string[])=>catalog.mode!=='visual-fixture'?ordered(values,labels):labels.flatMap(label=>{
    const ref=values.find(ref=>ref.label.toLowerCase()===label.toLowerCase()||label==='Web & motion'&&ref.label==='Web & motion design');
    return ref?[{...ref,label}]:[];
  });
  const promptEntries=(refs:Ref[]):NavigationEntry[]=>refs.map(ref=>({id:ref.id,label:`${ref.label} prompts`,href:ref.href,count:ref.count,kind:'prompt'}));
  const groups:NavigationGroup[]=[
    {id:'models',title:'By model',entries:promptEntries(ordered(models,referenceOrder.models))},
    {id:'tasks',title:level==='hub'||level==='prompt'?'By task':'By use case',entries:promptEntries(entries(populated(catalog.useCases,'useCases'),referenceOrder.useCases).map(ref=>({...ref,href:taskHref(catalog.locale,ref.slug)})))},
    {id:'styles',title:'By style',entries:promptEntries(entries(populated(catalog.styles,'styles'),referenceOrder.styles).map(ref=>({...ref,href:styleHref(catalog.locale,ref.slug)})))},
    {id:'subjects',title:'By subject',entries:promptEntries(entries(populated(catalog.subjects,'subjects'),referenceOrder.subjects).map(ref=>({...ref,href:subjectHref(catalog.locale,ref.slug)})))},
  ];
  const views=websiteViews(catalog);
  for(const [axis,title] of [['use-case','Website purposes'],['model','Website models'],['tool','Website technologies']] as const) groups.push({id:`website-${axis}`,title,entries:views.filter(view=>view.axis===axis).map(view=>({id:view.id,label:`${view.label} · ${view.count} ${view.count===1?'case':'cases'}`,href:view.href,count:view.count,kind:'case'}))});
  const browse:NavigationEntry[]=[];
  const add=(id:string,label:string,href:string,available:boolean,count?:number)=>{if(available)browse.push({id,label,href,count,kind:'navigation'});};
  add('images','Image prompts',`${hub}/image`,catalog.prompts.some(prompt=>prompt.kind==='image'));
  add('videos','Video prompts',`${hub}/video`,catalog.prompts.some(prompt=>prompt.kind==='video'));
  add('website','Website views',`${hub}/website`,(catalog.websites?.length??0)>0);
  for(const view of views.filter(view=>view.axis==='all'))add(view.id,'All website cases',view.href,true,view.count);
  add('all','All prompts',hub,catalog.prompts.length>0);
  add('all-models','All models',`${hub}/models`,models.length>0);
  add('all-creators','All creators',`${hub}/creators`,catalog.creators.some(creator=>catalog.prompts.some(prompt=>isPromptCreator(prompt,creator))));
  add('index','Library index',`${hub}/library-index`,catalog.mode==='git-beta');
  groups.push({id:'browse',title:'Browse',entries:browse});
  return groups.filter(group=>group.entries.length);
}
export function footerNavigation(catalog:Catalog,level:'hub'|'deck'|'model'|'prompt'='hub'):NavigationGroup[] {
  const browse=libraryNavigation(catalog,level).find(group=>group.id==='browse')?.entries ?? [];
  return [
    {id:'browse',title:'Browse',entries:['all','images','videos','website'].flatMap(id=>browse.filter(entry=>entry.id===id))},
    {id:'explore',title:'Explore',entries:['all-models','all-creators','index'].flatMap(id=>browse.filter(entry=>entry.id===id))},
  ].filter(group=>group.entries.length);
}
export function libraryIndex(catalog:Catalog) {
  const groups=libraryNavigation(catalog),promptEntry=(prompt:Catalog['prompts'][number]):NavigationEntry=>({id:prompt.id,label:prompt.title,href:prompt.href,kind:'prompt'});
  const collections:NavigationGroup[]=[
    {id:'image-details',title:'Image prompts',entries:catalog.prompts.filter(prompt=>prompt.kind==='image').map(promptEntry)},
    {id:'video-details',title:'Video prompts',entries:catalog.prompts.filter(prompt=>prompt.kind==='video').map(promptEntry)},
    {id:'other-details',title:'Other supplied prompts',entries:catalog.prompts.filter(prompt=>!['image','video'].includes(prompt.kind)).map(promptEntry)},
    {id:'website-details',title:'Website cases',entries:websiteEntries(catalog).map((entry):NavigationEntry=>({id:entry.id,label:entry.title,href:entry.href,kind:'case'}))},
  ].filter(group=>group.entries.length);
  const routes=[...new Set([...groups,...collections].flatMap(group=>group.entries.map(entry=>entry.href)))].sort();
  return {schemaVersion:1,locale:catalog.locale,revision:catalog.revision,groups,collections,routes};
}
