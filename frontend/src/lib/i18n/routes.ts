import type {Locale} from '@/lib/catalog/types';
export const libraryLocales:readonly Locale[]=['zh-CN','en'];
/** Only library-relative URLs can be switched; source/external links remain untouched. */
export function switchLocaleHref(href:string,target:Locale):string{
 if(!/^\/(?:zh-CN|en)(?=\/|\?|#|$)/.test(href))throw new Error('Locale switch requires an internal localized path');
 return href.replace(/^\/(?:zh-CN|en)(?=\/|\?|#|$)/,`/${target}`);
}
export function localizedHref(href:string,locale:Locale):string{return /^\/(?:zh-CN|en)(?=\/|\?|#|$)/.test(href)?switchLocaleHref(href,locale):href;}
