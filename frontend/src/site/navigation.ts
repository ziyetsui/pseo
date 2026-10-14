import { interfaceLocale, text, caseCount } from '@/lib/i18n/text';
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
  return [...values].sort((a,b)=>(ranks.get((a.sourceLabel ?? a.label).toLowerCase())??100)-(ranks.get((b.sourceLabel ?? b.label).toLowerCase())??100));
}
export function libraryNavigation(catalog:Catalog,level:'hub'|'deck'|'model'|'prompt'='hub'):NavigationGroup[] {
  const uiLocale=interfaceLocale(catalog);
  const hub=`/${catalog.locale}/prompts`,models=modelFamilies(catalog).filter(model=>model.count>0);
  const populated=(values:Ref[],axis:'useCases'|'styles'|'subjects')=>values.map(ref=>({...ref,count:new Set(catalog.prompts.filter(prompt=>prompt[axis].some(term=>term.id===ref.id||term.slug===ref.slug)).map(prompt=>prompt.id)).size})).filter(ref=>ref.count>0);
  const entries=(values:Ref[],labels:string[])=>catalog.mode!=='visual-fixture'?ordered(values,labels):labels.flatMap(label=>{
    const ref=values.find(ref=>ref.label.toLowerCase()===label.toLowerCase()||label==='Web & motion'&&ref.label==='Web & motion design');
    return ref?[{...ref,label}]:[];
  });
  const promptEntries=(refs:Ref[]):NavigationEntry[]=>refs.map(ref=>({id:ref.id,label:text(uiLocale, `${ref.label} prompts`, `${ref.label}提示词`),href:ref.href,count:ref.count,kind:'prompt'}));
  const groups:NavigationGroup[]=[
    {id:'models',title:text(interfaceLocale(catalog), 'By model', '按模型'),entries:promptEntries(ordered(models,referenceOrder.models))},
    {id:'tasks',title:level==='hub'||level==='prompt'?text(uiLocale, 'By task', '按任务'):text(uiLocale, 'By use case', '按用途'),entries:promptEntries(entries(populated(catalog.useCases,'useCases'),referenceOrder.useCases).map(ref=>({...ref,href:taskHref(catalog.locale,ref.slug)})))},
    {id:'styles',title:text(interfaceLocale(catalog), 'By style', '按风格'),entries:promptEntries(entries(populated(catalog.styles,'styles'),referenceOrder.styles).map(ref=>({...ref,href:styleHref(catalog.locale,ref.slug)})))},
    {id:'subjects',title:text(interfaceLocale(catalog), 'By subject', '按主题'),entries:promptEntries(entries(populated(catalog.subjects,'subjects'),referenceOrder.subjects).map(ref=>({...ref,href:subjectHref(catalog.locale,ref.slug)})))},
  ];
  const views=websiteViews(catalog);
  for(const [axis,title] of [['use-case','Website purposes'],['model','Website models'],['tool','Website technologies']] as const) groups.push({id:`website-${axis}`,title:text(uiLocale,title, ({'Website purposes':'网站用途','Website models':'网站模型','Website technologies':'网站技术'} as Record<string,string>)[title] ?? title),entries:views.filter(view=>view.axis===axis).map(view=>({id:view.id,label:`${view.label} · ${caseCount(uiLocale, view.count)}`,href:view.href,count:view.count,kind:'case'}))});
  const browse:NavigationEntry[]=[];
  const add=(id:string,label:string,href:string,available:boolean,count?:number)=>{if(available)browse.push({id,label,href,count,kind:'navigation'});};
  add('images',text(uiLocale, 'Image prompts', '图片提示词'),`${hub}/image`,catalog.prompts.some(prompt=>prompt.kind==='image'));
  add('videos',text(uiLocale, 'Video prompts', '视频提示词'),`${hub}/video`,catalog.prompts.some(prompt=>prompt.kind==='video'));
  add('website',text(uiLocale, 'Website views', '网站分类'),`${hub}/website`,(catalog.websites?.length??0)>0);
  for(const view of views.filter(view=>view.axis==='all'))add(view.id,text(uiLocale,'All website cases','全部网站案例'),view.href,true,view.count);
  add('all',text(uiLocale, 'All prompts', '全部提示词'),hub,catalog.prompts.length>0);
  add('all-models',text(uiLocale, 'All models', '全部模型'),`${hub}/models`,models.length>0);
  add('all-creators',text(uiLocale, 'All creators', '全部创作者'),`${hub}/creators`,catalog.creators.some(creator=>catalog.prompts.some(prompt=>isPromptCreator(prompt,creator))));
  add('index',text(uiLocale, 'Library index', '提示词库目录'),`${hub}/library-index`,catalog.mode==='git-beta');
  groups.push({id:'browse',title:text(interfaceLocale(catalog), 'Browse', '浏览'),entries:browse});
  return groups.filter(group=>group.entries.length);
}
export function footerNavigation(catalog:Catalog,level:'hub'|'deck'|'model'|'prompt'='hub'):NavigationGroup[] {
  const locale=interfaceLocale(catalog),groups=libraryNavigation(catalog,level);
  const entries=(id:string)=>groups.find(group=>group.id===id)?.entries ?? [];
  const browse=entries('browse');
  const pick=(ids:string[])=>ids.flatMap(id=>browse.filter(entry=>entry.id===id));
  const featured=(id:string,limit:number)=>entries(id).slice(0,limit).map(entry=>({...entry,label:entry.label.replace(/ prompts$|提示词$/u,'')}));
  return [
    {id:'browse',title:text(locale,'Browse','浏览'),entries:pick(['all','images','videos','website','all-creators','index'])},
    {id:'models',title:text(locale,'By model','按模型'),entries:[...featured('models',4),...pick(['all-models'])]},
    {id:'tasks',title:text(locale,'By task','按任务'),entries:featured('tasks',5)},
    {id:'styles',title:text(locale,'By style','按风格'),entries:featured('styles',5)},
  ].filter(group=>group.entries.length);
}
export function libraryIndex(catalog:Catalog) {
  const groups=libraryNavigation(catalog),promptEntry=(prompt:Catalog['prompts'][number]):NavigationEntry=>({id:prompt.id,label:prompt.title,href:prompt.href,kind:'prompt'});
  const collections:NavigationGroup[]=[
    {id:'image-details',title:text(interfaceLocale(catalog), 'Image prompts', '图片提示词'),entries:catalog.prompts.filter(prompt=>prompt.kind==='image').map(promptEntry)},
    {id:'video-details',title:text(interfaceLocale(catalog), 'Video prompts', '视频提示词'),entries:catalog.prompts.filter(prompt=>prompt.kind==='video').map(promptEntry)},
    {id:'other-details',title:text(interfaceLocale(catalog), 'Other supplied prompts', '其他所附提示词'),entries:catalog.prompts.filter(prompt=>!['image','video'].includes(prompt.kind)).map(promptEntry)},
    {id:'website-details',title:text(interfaceLocale(catalog), 'Website cases', '网站案例'),entries:websiteEntries(catalog).map((entry):NavigationEntry=>({id:entry.id,label:entry.title,href:entry.href,kind:'case'}))},
  ].filter(group=>group.entries.length);
  const routes=[...new Set([...groups,...collections].flatMap(group=>group.entries.map(entry=>entry.href)))].sort();
  return {schemaVersion:1,locale:catalog.locale,revision:catalog.revision,groups,collections,routes};
}
