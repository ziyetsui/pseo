'use client';
import {useSyncExternalStore} from 'react';
import type {Locale} from '@/lib/catalog/types';
import {switchLocaleHref} from '@/lib/i18n/routes';
const eventName='prompt-library:query';
function subscribe(callback:()=>void){window.addEventListener('popstate',callback);window.addEventListener('hashchange',callback);window.addEventListener(eventName,callback);return()=>{window.removeEventListener('popstate',callback);window.removeEventListener('hashchange',callback);window.removeEventListener(eventName,callback);};}
function current(){return location.pathname+location.search+location.hash;}
/** SSR has a real same-object counterpart; hydration preserves current filter/hash state. */
export function LanguageSwitch({locale,href}:{locale:Locale;href:string}){
 const locationHref=useSyncExternalStore(subscribe,current,()=>href);
 const target:Locale=locale==='zh-CN'?'en':'zh-CN';
 // Website filters use native pushState; read at activation as well as store notifications.
 return <a className="language-switch" data-language-switch="" href={switchLocaleHref(locationHref,target)} hrefLang={target} lang={target} aria-label={locale==='zh-CN'?'切换为英文':'Switch to Chinese'} onClick={event=>{event.currentTarget.href=switchLocaleHref(current(),target);}}>{target==='en'?'English':'中文'}</a>;
}
