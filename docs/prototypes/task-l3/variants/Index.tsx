'use client';
import {useState} from 'react';
import type {Prompt} from '@/lib/catalog/types';
import {Explorer, terms, PromptDetail, type Props} from '../shared';
function Reader({rows}:{rows:Prompt[]}){
 const [model,setModel]=useState(''),[id,setId]=useState(rows[0].id);
 const shown=rows.filter(p=>!model||p.models.some(r=>r.slug===model)),selected=shown.find(p=>p.id===id)||shown[0];
 return <div className="index-layout"><section className="index-directory" aria-label="Prompt index"><label className="index-model">Model<select value={model} onChange={e=>setModel(e.target.value)}><option value="">All models · {rows.length}</option>{terms(rows,'models').map(m=><option key={m.slug} value={m.slug}>{m.label} · {m.count}</option>)}</select></label><div className="index-list">{shown.map((p,i)=><button className="index-row" aria-pressed={p.id===selected?.id} key={p.id} onClick={()=>{setId(p.id);if(innerWidth<800)document.getElementById('reader')?.scrollIntoView({block:'start'})}}><span className="index-number">{String(i+1).padStart(2,'0')}</span><span><b>{p.title}</b><small>{p.handle} · {p.kind}</small></span><span aria-hidden="true">↗</span></button>)}</div></section><section className="index-reader" id="reader" aria-label="Selected prompt">{selected&&<PromptDetail prompt={selected}/>}</section></div>;
}
export default function Index(props:Props){return <Explorer {...props} intro="A reading desk for this task. Scan the index, open a result, and read the complete prompt without losing your place.">{rows=><Reader key={rows.map(r=>r.id).join(',')} rows={rows}/>}</Explorer>}
