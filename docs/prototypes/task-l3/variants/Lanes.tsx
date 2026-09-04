'use client';
import {useState} from 'react';
import type {Prompt} from '@/lib/catalog/types';
import {Explorer, terms, PromptCard, PeekDialog, type Props} from '../shared';
function Board({rows}:{rows:Prompt[]}){
 const [peek,setPeek]=useState<Prompt|null>(null),[model,setModel]=useState('');
 const models=terms(rows,'models');
 const groups=[...models,...(rows.some(p=>!p.models.length)?[{slug:'none',label:'No model named',count:rows.filter(p=>!p.models.length).length}]:[])];
 return <><nav className="model-tabs" aria-label="Model lanes"><button aria-pressed={!model} onClick={()=>setModel('')}>All models</button>{groups.map(m=><button key={m.slug} aria-pressed={model===m.slug} onClick={()=>setModel(m.slug)}>{m.label}<small>{m.count}</small></button>)}</nav><p className="lane-hint">Follow a model down its column. Prompts naming several models appear in each.</p><div className="lanes" role="region" aria-label="Prompt lanes by model" tabIndex={0}>{groups.filter(m=>!model||m.slug===model).map((m,i)=><section className="lane" key={m.slug}><div className="lane-head"><span className="proto-overline">{String(i+1).padStart(2,'0')}</span><h2>{m.label}</h2><b>{m.count}</b></div>{rows.filter(p=>m.slug==='none'?!p.models.length:p.models.some(r=>r.slug===m.slug)).map(p=><PromptCard key={p.id} prompt={p} onOpen={()=>setPeek(p)}/>)}</section>)}</div><PeekDialog prompt={peek} onClose={()=>setPeek(null)}/></>;
}
export default function Lanes(props:Props){return <Explorer {...props} intro="Start with the result. Follow each model through a column of images, videos and the prompts behind them.">{rows=><Board key={rows.map(r=>r.id).join(',')} rows={rows}/>}</Explorer>}
