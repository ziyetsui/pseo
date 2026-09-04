'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {Prompt} from './shared';
import {Deck} from './variants/Deck';
import {Matrix} from './variants/Matrix';
import {Atlas} from './variants/Atlas';
import {Index} from './variants/Index';
const names=['Deck','Matrix','Atlas','Index'];
export function Harness({rows,initial}:{rows:Prompt[];initial:number}){
const [current,setCurrent]=useState(initial),[mount,setMount]=useState(0),picker=useRef<HTMLElement>(null);
function activate(i:number){setCurrent(i);setMount(n=>n+1);const url=new URL(location.href);url.searchParams.set('v',String(i+1));history.replaceState(null,'',url);window.scrollTo(0,0)}
useLayoutEffect(()=>{const move=()=>{const nav=picker.current!,item=nav.querySelectorAll<HTMLButtonElement>('.proto-picker-item')[current],hi=nav.querySelector<HTMLElement>('.proto-picker-highlight')!;hi.style.width=`${item.offsetWidth}px`;hi.style.transform=`translateX(${item.offsetLeft}px)`};move();window.addEventListener('resize',move);const frame=requestAnimationFrame(()=>requestAnimationFrame(()=>picker.current?.setAttribute('data-ready','')));return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',move)}},[current]);
useEffect(()=>{function key(e:KeyboardEvent){const target=e.target as HTMLElement;if(/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)||target.isContentEditable||e.metaKey||e.ctrlKey||e.altKey)return;const num=parseInt(e.key,10);if(num>=1&&num<=4)activate(num-1);else if(e.key==='ArrowRight')activate((current+1)%4);else if(e.key==='ArrowLeft')activate((current+3)%4);else if(e.key.toLowerCase()==='r')setMount(n=>n+1)}document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[current]);
return <><div key={`${current}-${mount}`}>{current===0?<Deck/>:current===1?<Matrix rows={rows}/>:current===2?<Atlas rows={rows}/>:<Index rows={rows}/>}</div><nav className="proto-picker" aria-label="Prototype variants" ref={picker}><span className="proto-picker-highlight" aria-hidden="true"/>{names.map((name,i)=><button key={name} className="proto-picker-item" data-active={current===i?'':undefined} aria-current={current===i?'true':undefined} onClick={()=>activate(i)}>{name}</button>)}</nav></>;
}
