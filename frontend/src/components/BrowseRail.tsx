'use client';
import {useEffect,useRef,type ReactNode,type SyntheticEvent} from 'react';

/* Cards still to come wait as a deck at the rail's right edge; scrolling deals
   them out, and the deck's depth shows how much is left. Clicking or focusing a
   card still in the deck deals it instead of navigating. The cards stay
   server-rendered links; this only positions them. */
const PEEK=18,DEPTH=3;

function geometry(el:HTMLElement){
  const tile=el.querySelector<HTMLElement>('.tile');
  const width=tile?.offsetWidth??0,gap=parseFloat(getComputedStyle(el).columnGap)||0;
  // The last fully dealt card ends where the deck begins; the deck keeps PEEK × DEPTH px.
  const limit=el.clientWidth-(parseFloat(getComputedStyle(el).paddingLeft)||0)-PEEK*DEPTH-width;
  return {step:width+gap,limit};
}

export function BrowseRail({heading,label,children}:{heading:ReactNode;label:string;children:ReactNode}){
  const track=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=track.current;
    if(!el)return;
    let frame=0;
    // Scroll-linked, so styles are written straight onto the cards once per frame.
    const layout=()=>{
      frame=0;
      const tiles=el.querySelectorAll<HTMLElement>('.tile');
      const {step,limit}=geometry(el);
      tiles.forEach((tile,index)=>{
        const x=tile.offsetLeft-el.scrollLeft,over=x-limit;
        tile.style.zIndex=String(tiles.length-index);
        if(over<=0||!step){tile.style.transform='';tile.style.opacity='';tile.style.removeProperty('--deal');tile.removeAttribute('data-deck');return;}
        const depth=Math.min(over/step,DEPTH+1),shown=Math.min(depth,DEPTH);
        tile.style.transform=`translateX(${limit+PEEK*shown-x}px) scale(${1-.045*shown})`;
        tile.style.opacity=depth>DEPTH?String(Math.max(0,DEPTH+1-depth)):'';
        tile.style.setProperty('--deal',String(shown/DEPTH));
        tile.toggleAttribute('data-deck',depth>.35);
      });
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(layout);};
    layout();
    el.addEventListener('scroll',schedule,{passive:true});
    const observer=new ResizeObserver(schedule);
    observer.observe(el);
    return()=>{el.removeEventListener('scroll',schedule);observer.disconnect();cancelAnimationFrame(frame);};
  },[]);
  const deal=(event:SyntheticEvent,navigate:boolean)=>{
    const el=track.current,tile=(event.target as HTMLElement).closest<HTMLElement>('.tile');
    if(!el||!tile?.hasAttribute('data-deck'))return;
    if(navigate)event.preventDefault();
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({left:tile.offsetLeft-el.scrollLeft-geometry(el).limit,behavior:reduce?'auto':'smooth'});
  };
  return <>
    <div className="sec-h">{heading}</div>
    <div className="rail">
      <div className="tiles" ref={track} tabIndex={0} role="region" aria-label={label} onClick={event=>deal(event,true)} onFocus={event=>deal(event,false)}>{children}</div>
    </div>
  </>;
}
