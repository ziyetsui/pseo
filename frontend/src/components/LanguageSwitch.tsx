'use client';
import {useEffect,useRef,useSyncExternalStore} from 'react';
import type {Locale} from '@/lib/catalog/types';
import {switchLocaleHref} from '@/lib/i18n/routes';
const eventName='prompt-library:query';
function subscribe(callback:()=>void){window.addEventListener('popstate',callback);window.addEventListener('hashchange',callback);window.addEventListener(eventName,callback);return()=>{window.removeEventListener('popstate',callback);window.removeEventListener('hashchange',callback);window.removeEventListener(eventName,callback);};}
function current(){return location.pathname+location.search+location.hash;}
/** Native disclosure keeps both language routes usable before hydration and without JS. */
export function LanguageSwitch({locale,href}:{locale:Locale;href:string}){
 const locationHref=useSyncExternalStore(subscribe,current,()=>href);
 const picker=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  function closeOutside(event:PointerEvent){if(event.target instanceof Node&&!picker.current?.contains(event.target))picker.current?.removeAttribute('open');}
  function escape(event:KeyboardEvent){if(event.key==='Escape'&&picker.current?.open){picker.current.open=false;picker.current.querySelector('summary')?.focus();}}
  document.addEventListener('pointerdown',closeOutside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',closeOutside);document.removeEventListener('keydown',escape);};
 },[]);
 return <details className="language-switch" data-language-picker="" ref={picker}>
  <summary aria-label={locale==='zh-CN'?'阅读语言：中文':'Reading language: English'} onPointerDown={()=>{if(picker.current)delete picker.current.dataset.keyboard;}} onKeyDown={event=>{if((event.key==='Enter'||event.key===' ')&&picker.current)picker.current.dataset.keyboard='';}}>
   <span className="language-switch-monogram" aria-hidden="true">Aa</span><span className="language-switch-label" lang={locale}>{locale==='zh-CN'?'中文':'English'}</span><svg className="language-switch-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 5.5 4.5 4.5 4.5-4.5" /></svg>
  </summary>
  <div className="language-switch-options">
   <p className="language-switch-heading">{locale==='zh-CN'?'阅读语言':'Reading language'}</p>
   {(['zh-CN','en'] as const).map(target=><a key={target} data-language-switch={target!==locale?'':undefined} href={switchLocaleHref(locationHref,target)} hrefLang={target} lang={target} aria-current={target===locale?'page':undefined} onClick={event=>{
    // Filters can use native pushState: resolve the latest URL at activation too.
    event.currentTarget.href=switchLocaleHref(current(),target);
    try{localStorage.setItem('prompt-library:locale',target);}catch{/* Navigation works if preference storage is unavailable. */}
    if(picker.current)picker.current.open=false;
   }}><span>{target==='en'?'English':'中文'}</span>{target===locale&&<svg className="language-switch-mark" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3.2 3.2L13 4.5" /></svg>}</a>)}
  </div>
 </details>;
}
