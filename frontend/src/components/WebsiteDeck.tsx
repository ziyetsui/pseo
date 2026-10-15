'use client';
import { PromptWords } from './Filters';
import { uiText, text, sourceLanguage, originalLanguage } from '@/lib/i18n/text';
import type { Locale } from '@/lib/catalog/types';
import { useState, useSyncExternalStore, type CSSProperties } from 'react';
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export interface WebsiteSlide {
  id: string; title: string; href: string; cover: string; summary: string;
  caption: string; sourceUrl?: string; attribution?: string; prompt?: string; language?:string; translated?:boolean;
}
export function WebsiteDeck({ items, kind , uiLocale = 'en'}: { items: WebsiteSlide[]; kind: 'view' | 'case' ; uiLocale?: Locale }) {
  const [position,setPosition] = useState(0);
  const ready=useSyncExternalStore(subscribe,clientReady,serverReady);
  const step = (delta: number) => setPosition(index => Math.max(0,Math.min(items.length-1,index+delta)));
  return <div className="deckwrap" onKeyDown={event => {
    if (event.metaKey || event.ctrlKey || event.altKey || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
    if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable=true]')) return;
    event.preventDefault();step(event.key === 'ArrowRight' ? 1 : -1);
  }}><div className="deck" tabIndex={0} role="group" aria-label={text(uiLocale, `Website ${kind} deck. Use left and right arrows.`, "网站卡片组。使用左右方向键浏览。")}>
    {items.map((item,index) => {
      const offset=index-position,depth=offset<0?-3:Math.min(offset,4);
      return <article className="dc" key={item.id} inert={offset!==0} data-vis={offset>=0&&offset<=3?'':undefined} data-top={offset===0?'':undefined} data-website-case={kind==='case'?item.id:undefined} data-website-deck-view={kind==='view'?item.id:undefined} style={{'--o':depth,'--dz':offset>=0?30-Math.min(offset,4):0} as CSSProperties}>
        <div className="media">{item.cover && <img src={item.cover} alt={item.title} width={480} height={520} loading={index===0?'eager':'lazy'} />}<span className="mb">{item.caption}</span></div>
        <div className="side"><h3 lang={kind === 'case' ? sourceLanguage(item.title) : uiLocale}><a data-case-title="" href={item.href}>{item.title}</a></h3><p className="meta">{item.attribution}{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{uiText(uiLocale, "View original source ↗")}</a>}</p><p lang={kind === 'case' ? sourceLanguage(item.summary) : uiLocale}>{item.summary}</p>{kind === 'case' && item.prompt && <p className="eyebrow">{originalLanguage(uiLocale, item.language ?? sourceLanguage(item.summary || item.title), item.translated)}</p>}<pre lang={item.prompt ? item.language ?? sourceLanguage(item.prompt) : uiLocale} className="prompt" tabIndex={0} aria-label={item.prompt? uiText(uiLocale, "Supplied prompt"): uiText(uiLocale, "About this collection")}>{item.prompt ? <PromptWords text={item.prompt} markClassName="ph" /> : item.caption}</pre><div className="dcacts"><a className="btn primary" href={item.href}>{kind==='view'? uiText(uiLocale, "Explore this view"): uiText(uiLocale, "Explore this project")}</a></div></div>
      </article>;
    })}
  </div><div className="dknav"><button className="btn" type="button" disabled={!ready||position===0} onClick={()=>step(-1)}>{uiText(uiLocale, "← Previous")}</button><button className="btn" type="button" disabled={!ready||position>=items.length-1} onClick={()=>step(1)}>{uiText(uiLocale, "Next →")}</button><p className="dkpos" aria-live="polite">{text(uiLocale, `${position+1} of ${items.length}`, `${position+1} / ${items.length}`)}</p><p className="dkhint">{uiText(uiLocale, "The stack behind the card is the rest of the set.")}</p></div></div>;
}
