import membershipInput from '@/data/website-category-membership.json';
import type {Locale,Ref} from './types';
import {legacyWebsiteSlugs} from './website-taxonomy-routes';
export {websiteLegacyPaths} from './website-taxonomy-routes';
export const isWebsiteTask = (slug:string) => (legacyWebsiteSlugs as readonly string[]).includes(slug);
export const websiteTaskReference = (locale:Locale,count=0):Ref => ({id:'navigation:website',slug:'website',label:locale==='zh-CN'?'网站与开发':'Web design & development',sourceLabel:'Web design & development',href:`/${locale}/prompts/website`,count});
export const websitePurposeDefinitions = [
 {slug:'web-design',en:'Website design',zh:'网站设计'},
 {slug:'app-development',en:'Application development',zh:'应用开发'},
 {slug:'creative-coding',en:'Creative coding',zh:'创意编程'},
] as const;
export const websiteMembership:Readonly<Record<string,string>> = membershipInput;
export function websitePurposeReference(locale:Locale,id:string):Ref {
 const definition=websitePurposeDefinitions.find(definition=>definition.slug===websiteMembership[id]);
 if(!definition)throw new Error(`Missing Website primary category: ${id}`);
 return {id:`navigation:website-purpose:${definition.slug}`,slug:definition.slug,label:locale==='zh-CN'?definition.zh:definition.en,href:`/${locale}/prompts/website/views/use-case/${definition.slug}`,count:0};
}
