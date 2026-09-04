'use client';
import {useState,useRef,useLayoutEffect,useEffect} from 'react';
import Current from './variants/credit/Current';
import Colophon from './variants/credit/Colophon';
import Signature from './variants/credit/Signature';
import Plaque from './variants/credit/Plaque';
import Kinetic from './variants/credit/Kinetic';
const names=['Current','Colophon','Signature','Plaque','Kinetic'], variants=[Current,Colophon,Signature,Plaque,Kinetic];
/* Four of the five have an entrance, so the pill carries the replay control PICKER.md specifies.
   In production that entrance would be gated to once per session (marketing-pages); here it runs
   on every mount, because a motion you cannot re-watch cannot be judged. */
export function CreditHarness({initial}:{initial:number}){
 const [current,setCurrent]=useState(initial),[replay,setReplay]=useState(0),picker=useRef<HTMLElement>(null);
 function select(i:number){setCurrent(i);setReplay(r=>r+1);const url=new URL(location.href);url.searchParams.set('v',String(i+1));history.replaceState(null,'',url);}
 useLayoutEffect(()=>{const nav=picker.current!;const move=()=>{const el=nav.querySelectorAll<HTMLElement>('.proto-picker-item:not(.proto-picker-replay)')[current],h=nav.querySelector<HTMLElement>('.proto-picker-highlight')!;h.style.width=`${el.offsetWidth}px`;h.style.transform=`translateX(${el.offsetLeft}px)`;};move();window.addEventListener('resize',move);return()=>window.removeEventListener('resize',move)},[current]);
 useEffect(()=>{const f=requestAnimationFrame(()=>requestAnimationFrame(()=>picker.current?.setAttribute('data-ready','')));return()=>cancelAnimationFrame(f)},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const t=e.target as HTMLElement;if(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable||e.metaKey||e.ctrlKey||e.altKey)return;const n=parseInt(e.key,10);if(n>=1&&n<=variants.length)select(n-1);else if(e.key==='ArrowRight'){e.preventDefault();select((current+1)%variants.length)}else if(e.key==='ArrowLeft'){e.preventDefault();select((current+variants.length-1)%variants.length)}else if(e.key==='r'||e.key==='R')setReplay(r=>r+1)};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[current]);
 const Variant=variants[current];
 return <><Variant key={`${current}-${replay}`}/><nav className="proto-picker" aria-label="Prototype variants" ref={picker}><span className="proto-picker-highlight" aria-hidden="true"/>{names.map((name,i)=><button key={name} className="proto-picker-item" data-active={i===current?'':undefined} aria-current={i===current?'true':undefined} onClick={()=>select(i)}>{name}</button>)}<span className="proto-picker-divider" aria-hidden="true"/><button className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={()=>setReplay(r=>r+1)}>↻</button></nav></>;
}
