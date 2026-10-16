'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';

type Edges={start:boolean;end:boolean;overflow:boolean};

/* Horizontal browse rail: the cards stay server-rendered links, this only adds the
   edge fades and paging buttons that tell people the row continues to the right. */
export function BrowseRail({heading,label,prev,next,children}:{heading:ReactNode;label:string;prev:string;next:string;children:ReactNode}){
  const track=useRef<HTMLDivElement>(null);
  const [edges,setEdges]=useState<Edges>({start:true,end:false,overflow:true});
  useEffect(()=>{
    const el=track.current;
    if(!el)return;
    let frame=0;
    const measure=()=>{
      frame=0;
      const max=el.scrollWidth-el.clientWidth;
      // 2px slack absorbs sub-pixel scroll positions at either end.
      const state={start:el.scrollLeft<=2,end:el.scrollLeft>=max-2,overflow:max>2};
      setEdges(current=>current.start===state.start&&current.end===state.end&&current.overflow===state.overflow?current:state);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
    measure();
    el.addEventListener('scroll',schedule,{passive:true});
    const observer=new ResizeObserver(schedule);
    observer.observe(el);
    return()=>{el.removeEventListener('scroll',schedule);observer.disconnect();cancelAnimationFrame(frame);};
  },[]);
  const page=(direction:1|-1)=>{
    const el=track.current;
    if(!el)return;
    const card=el.querySelector<HTMLElement>('.tile');
    const gap=parseFloat(getComputedStyle(el).columnGap)||0;
    const step=card?card.offsetWidth+gap:el.clientWidth*.8;
    // Page by whole cards that fit the viewport, leaving one card of context.
    const cards=Math.max(1,Math.floor(el.clientWidth/step)-1);
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({left:direction*cards*step,behavior:reduce?'auto':'smooth'});
  };
  return <>
    <div className="sec-h">{heading}{edges.overflow&&<div className="rail-nav">
      <button type="button" className="rail-btn" aria-label={prev} disabled={edges.start} onClick={()=>page(-1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg></button>
      <button type="button" className="rail-btn" aria-label={next} disabled={edges.end} onClick={()=>page(1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg></button>
    </div>}</div>
    <div className="rail" data-start={edges.start||undefined} data-end={edges.end||undefined}>
      <div className="tiles" ref={track} tabIndex={0} role="region" aria-label={label}>{children}</div>
    </div>
  </>;
}
