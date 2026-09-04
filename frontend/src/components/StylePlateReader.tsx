'use client';

import type { Axis, Catalog, Prompt, Ref } from '@/lib/catalog/types';
import { PromptWords, usePromptExplorer, facetOptions } from './Filters';
import { PromptMedia } from './PromptMedia';
import { generationLabel } from './generation-label';
import { promptWords } from '@/lib/cta/sign-in-gate';
import { SignInGate } from '@/components/SignInGate';

const axes: Axis[] = ['model', 'useCase', 'technique', 'subject'];
const pad = (n:number) => String(n).padStart(2,'0');
function plateFrames(prompt: Prompt) {
  const video = prompt.media.find(m => m.kind === 'video');
  if (video) return [{...prompt, media:[video]}];
  const images = prompt.media.filter(m => m.kind === 'image').slice(0,3);
  if (images.length) return images.map(m => ({...prompt,img:m.src,media:[m]}));
  return prompt.img ? [prompt] : [];
}
export function StylePlateReader({ catalog, style }: { catalog: Catalog; style: Ref }) {
  const explorer = usePromptExplorer(catalog), rows = explorer.rows;
  return <><div className="ctrl"><div className="wrap"><div className="bar">
    <form className="search" role="search" onSubmit={e=>e.preventDefault()}><label className="vh" htmlFor="style-search">Search {style.label} prompts</label><input id="style-search" type="search" maxLength={200} value={explorer.q} placeholder="Search this style…" onChange={e=>explorer.setQuery(e.target.value)} /></form>
    <div className="scroller" role="group" aria-label="Filter within this style">{axes.flatMap(axis=>facetOptions(catalog.prompts,axis,true).filter((ref,i)=>i<3||explorer.selected(axis,ref.slug)).map(ref=><button className="chip" type="button" key={`${axis}-${ref.id}`} aria-pressed={explorer.selected(axis,ref.slug)} onClick={()=>explorer.toggle(axis,ref.slug)}>{ref.label} <small>{ref.count}</small></button>))}</div>
    {explorer.active && <button className="chip clear" type="button" onClick={explorer.clear}>Clear filters</button>}
  </div><span className="vh" role="status">{rows.length} of {catalog.prompts.length} {style.label} {catalog.prompts.length === 1 ? 'prompt' : 'prompts'}</span></div></div>
  <div className="style-results" data-style={style.slug}>
    {!rows.length ? <section className="wrap empty-wrap"><div className="empty" role="status">{catalog.prompts.length ? <><b>No {style.label} prompt matches those filters.</b><p>Clear the filters to return to {catalog.prompts.length === 1 ? 'the' : 'all'} {catalog.prompts.length} {catalog.prompts.length === 1 ? 'prompt' : 'prompts'} in this style.</p><button className="btn pri" type="button" onClick={explorer.clear}>Clear filters</button></> : <><b>No {style.label} prompts in the library yet.</b><p>Explore another style or browse the library.</p><a className="btn pri" href={`/${catalog.locale}/prompts`}>Browse all prompts</a></>}</div></section> : <>
      <section className="wrap lopwrap" id="style-index"><h2>List of plates</h2><nav className="lop" aria-label="List of plates">{rows.map((p,i)=><a key={p.id} href={`#plate-${p.id}`}><span className="fno">{pad(i+1)}</span><span className="t" lang={p.locale}>{p.title}</span></a>)}</nav></section>
      <section className="wrap plates"><h2 className="vh">Plates</h2>{rows.map((p,i)=>{
        const frames=plateFrames(p), count=p.media.length || (p.img ? 1 : 0);
        return <figure className={`plate${i%2?' verso':''}`} id={`plate-${p.id}`} key={p.id} data-prompt-id={p.id} data-lg-row="" data-lg-chars={p.prompt.length} data-lg-words={promptWords(p.prompt)}><div className="well">{frames.length ? <div className={`frames${frames.length>1?' multi':''}`}>{frames.map((frame,k)=><span className="mount" key={frame.media[0]?.id ?? k}><PromptMedia prompt={frame} width={1200} height={900} /></span>)}</div> : <p className="textplate" lang={p.language}><PromptWords text={p.prompt} /></p>}</div>
          <figcaption className="cap"><p className="fig">Plate {pad(i+1)}{frames.length>1?` a–${'abc'.charAt(frames.length-1)}`:''}</p><h3 lang={p.locale}><a href={p.href}>{p.title}</a></h3><dl>
            <dt>Medium</dt><dd>{p.models.map(m=>m.label).join(', ') || 'no model named'}</dd>
            <dt>Credit</dt><dd><a href={p.source.url} target="_blank" rel="nofollow noopener noreferrer">{p.handle || 'Source post'} ↗</a></dd>
            <dt>Extent</dt><dd>{count ? `${count} media ${count===1?'item':'items'}` : 'Text only'}{p.likes!==null?` · ${p.likes.toLocaleString('en-US')} likes`:''}</dd>
            <dt>Subject</dt><dd>{p.subjects[0]?.label || p.useCases[0]?.label || 'unclassified'}</dd>
          </dl><p className="wall" lang={p.language}><PromptWords text={p.prompt} /></p><div className="rr"><a className="btn pri" href={p.href}>{generationLabel(p.kind)}</a><a className="btn" href={p.href}>Full record →</a></div><a className="plate-index-link" href="#style-index">Back to the index ↑</a></figcaption>
        </figure>;
      })}</section>
    </>}
  </div><SignInGate /></>;
}
