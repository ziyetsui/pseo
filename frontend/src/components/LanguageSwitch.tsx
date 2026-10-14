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
  <summary>Language <span className="language-switch-chevron" aria-hidden="true">▾</span></summary>
  <div className="language-switch-options">
   {(['en','zh-CN'] as const).map(target=><a key={target} data-language-switch={target!==locale?'':undefined} href={switchLocaleHref(locationHref,target)} hrefLang={target} lang={target} aria-current={target===locale?'page':undefined} onClick={event=>{
    // Filters can use native pushState: resolve the latest URL at activation too.
    event.currentTarget.href=switchLocaleHref(current(),target);
    try{localStorage.setItem('prompt-library:locale',target);}catch{/* Navigation works if preference storage is unavailable. */}
    if(picker.current)picker.current.open=false;
   }}><span>{target==='en'?'English':'中文'}</span>{target===locale&&<span aria-hidden="true">✓</span>}</a>)}
  </div>
 </details>;
}
