'use client';
import {useState,useRef,useLayoutEffect,useEffect} from 'react';
import type {Catalog} from '@/lib/catalog/types';
import Current from './variants/browse/Current';
import Plate from './variants/browse/Plate';
import Ledger from './variants/browse/Ledger';
import Field from './variants/browse/Field';
import Directory from './variants/browse/Directory';
const names=['Current','Plate','Ledger','Field','Directory'], variants=[Current,Plate,Ledger,Field,Directory];
/* No replay control: nothing in these five has an entrance to re-trigger, and PICKER.md says a
   static comparison gets the shorter pill. Switching does not scroll — the band is what changes,
   so the eye should stay where it is. */
export function BrowseHarness({catalog,initial}:{catalog:Catalog;initial:number}){
 const [current,setCurrent]=useState(initial),picker=useRef<HTMLElement>(null);
 function select(i:number){setCurrent(i);const url=new URL(location.href);url.searchParams.set('v',String(i+1));history.replaceState(null,'',url);}
 useLayoutEffect(()=>{const nav=picker.current!;const move=()=>{const el=nav.querySelectorAll<HTMLElement>('.proto-picker-item')[current],h=nav.querySelector<HTMLElement>('.proto-picker-highlight')!;h.style.width=`${el.offsetWidth}px`;h.style.transform=`translateX(${el.offsetLeft}px)`;};move();window.addEventListener('resize',move);return()=>window.removeEventListener('resize',move)},[current]);
 useEffect(()=>{const f=requestAnimationFrame(()=>requestAnimationFrame(()=>picker.current?.setAttribute('data-ready','')));return()=>cancelAnimationFrame(f)},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const t=e.target as HTMLElement;if(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable||e.metaKey||e.ctrlKey||e.altKey)return;const n=parseInt(e.key,10);if(n>=1&&n<=variants.length)select(n-1);else if(e.key==='ArrowRight'){e.preventDefault();select((current+1)%variants.length)}else if(e.key==='ArrowLeft'){e.preventDefault();select((current+variants.length-1)%variants.length)}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[current]);
 const Variant=variants[current];
 return <><Variant key={current} catalog={catalog}/><nav className="proto-picker" aria-label="Prototype variants" ref={picker}><span className="proto-picker-highlight" aria-hidden="true"/>{names.map((name,i)=><button key={name} className="proto-picker-item" data-active={i===current?'':undefined} aria-current={i===current?'true':undefined} onClick={()=>select(i)}>{name}</button>)}</nav></>;
}
