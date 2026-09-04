'use client';
import {useRef,useState} from 'react';
import type {Prompt} from '@/lib/catalog/types';
import {Shell,Picture,Actions,Words,number,type EditorialProps} from './shared';
function Book({rows}:{rows:Prompt[]}){
 const [index,setIndex]=useState(0),book=useRef<HTMLElement>(null),p=rows[index];
 const turn=(next:number)=>{setIndex(next);requestAnimationFrame(()=>book.current?.scrollIntoView({block:'start',behavior:'instant'}))};
 return <section className="ed-book ed-wrap" ref={book}><div className="ed-book-bar"><p className="ed-label" role="status">Folio {number(index)} / {rows.length}</p><label><span className="vh">Jump to a prompt</span><select value={index} onChange={e=>turn(Number(e.target.value))}>{rows.map((p,i)=><option key={p.id} value={i}>{number(i)} — {p.title}</option>)}</select></label></div><article className="ed-spread" data-prompt-id={p.id}><div className="ed-facing"><Picture prompt={p}/><p className="ed-label">{p.kind} · {p.models.map(m=>m.label).join(' / ')||'No model named'}</p></div><div className="ed-leaf"><p className="ed-label">The words behind the result</p><h2>{p.title}</h2><p className="ed-byline">By {p.handle||'an unattributed author'}</p><Actions prompt={p}/><Words prompt={p} open/></div></article><nav className="ed-page-turn" aria-label="Folio navigation"><button disabled={index===0} onClick={()=>turn(index-1)}>← Previous</button><span>{number(index)} — {String(rows.length).padStart(2,'0')}</span><button disabled={index===rows.length-1} onClick={()=>turn(index+1)}>Next →</button></nav></section>;
}
export default function Folio(props:EditorialProps){return <Shell {...props} direction="folio" title={<>{props.task.label}: a working folio.</>} intro="The image on one page. The complete prompt on the other. Turn through the collection at your own pace.">{rows=><Book key={rows.map(p=>p.id).join(',')} rows={rows}/>}</Shell>}
