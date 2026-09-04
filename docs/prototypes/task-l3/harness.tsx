'use client';
import {useState,useRef,useLayoutEffect,useEffect} from 'react';
import type {Catalog,Ref} from '@/lib/catalog/types';
import Current from './variants/Current';
import Matrix from './variants/Matrix';
import Lanes from './variants/Lanes';
import Index from './variants/Index';
const names=['Current','Matrix','Lanes','Index'], variants=[Current,Matrix,Lanes,Index];
export function Harness({catalog,task,initial,initialModel}:{catalog:Catalog;task:Ref;initial:number;initialModel?:string}){
 const [current,setCurrent]=useState(initial),[replay,setReplay]=useState(0),picker=useRef<HTMLElement>(null);
 function select(i:number){window.scrollTo({top:0,behavior:'instant'});setCurrent(i);setReplay(r=>r+1);const url=new URL(location.href);url.searchParams.set('v',String(i+1));history.replaceState(null,'',url);}
 useLayoutEffect(()=>{const nav=picker.current!;const move=()=>{const el=nav.querySelectorAll<HTMLElement>('.proto-picker-item')[current],h=nav.querySelector<HTMLElement>('.proto-picker-highlight')!;h.style.width=`${el.offsetWidth}px`;h.style.transform=`translateX(${el.offsetLeft}px)`;};move();window.addEventListener('resize',move);return()=>window.removeEventListener('resize',move)},[current]);
 useEffect(()=>{const f=requestAnimationFrame(()=>requestAnimationFrame(()=>picker.current?.setAttribute('data-ready','')));return()=>cancelAnimationFrame(f)},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const t=e.target as HTMLElement;if(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable||e.metaKey||e.ctrlKey||e.altKey)return;const n=parseInt(e.key,10);if(n>=1&&n<=4)select(n-1);else if(e.key==='ArrowRight'){e.preventDefault();select((current+1)%4)}else if(e.key==='ArrowLeft'){e.preventDefault();select((current+3)%4)}else if(e.key.toLowerCase()==='r')setReplay(r=>r+1)};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[current]);
 const Variant=variants[current];
 return <><Variant key={`${current}-${replay}`} catalog={catalog} task={task} variant={current} initialModel={initialModel}/><nav className="proto-picker" aria-label="Prototype variants" ref={picker}><span className="proto-picker-highlight" aria-hidden="true"/>{names.map((name,i)=><button key={name} className="proto-picker-item" data-active={i===current?'':undefined} aria-current={i===current?'true':undefined} onClick={()=>select(i)}>{name}</button>)}</nav></>;
}
