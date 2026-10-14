'use client';
import { useEffect, useState } from 'react';
import type { Ref, WebsiteCase } from '@/lib/catalog/types';
import { filterWebsiteCases, type WebsiteFilters } from '@/lib/catalog/website-filter';
import { CollectionSignatureHero } from './ModelSignatureHero';
import { WebsiteCaseResults, type WebsitePresentation } from './WebsiteCaseResults';

function terms(rows: WebsiteCase[], axis: 'models' | 'useCases'): Ref[] {
  return [...new Map(rows.flatMap(item => item[axis]).filter(ref => ref.slug !== 'website').map(ref => [ref.slug, ref])).values()].sort((a,b) => a.label.localeCompare(b.label));
}
export function WebsiteCasesReader({ entries, href, presentation='deck', title='Website cases', locale='zh-CN', navigation=[], topics={}, promptTexts={} }: { entries: WebsiteCase[]; href: string; presentation?:WebsitePresentation; title?:string; locale?:string; navigation?:Ref[]; topics?:Record<string,Ref[]>; promptTexts?:Record<string,string> }) {
  const [ready, setReady] = useState(false);
  const [filters, setFilters] = useState<WebsiteFilters>({});
  const [draft, setDraft] = useState<WebsiteFilters>({});
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(location.search);
      const next = { q: params.get('q') ?? '', model: params.get('model') ?? '', purpose: params.get('purpose') ?? '' };
      setFilters(next); setDraft(next); setReady(true);
    };
    read(); window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  const rows = filterWebsiteCases(entries, filters);
  const controls = <>
    <form className="website-filters" method="get" action={href} onSubmit={event => {
      event.preventDefault(); const data = new FormData(event.currentTarget), params = new URLSearchParams();
      for (const key of ['q', 'model', 'purpose']) { const value = String(data.get(key) ?? '').trim(); if (value) params.set(key,value); }
      const next = { q: params.get('q') ?? '', model: params.get('model') ?? '', purpose: params.get('purpose') ?? '' };
      history.pushState(null, '', `${href}${params.size ? `?${params}` : ''}`); setFilters(next); setDraft(next);
    }}>
      <label>Search cases<input name="q" type="search" disabled={!ready} value={draft.q ?? ''} onChange={event => setDraft({...draft, q:event.target.value})} placeholder="Search websites, tools or creators" /></label>
      <label>Model<select name="model" disabled={!ready} value={draft.model ?? ''} onChange={event => setDraft({...draft, model:event.target.value})}><option value="">All models</option>{terms(entries,'models').map(ref => <option value={ref.slug} key={ref.id}>{ref.label}</option>)}</select></label>
      <label>Purpose<select name="purpose" disabled={!ready} value={draft.purpose ?? ''} onChange={event => setDraft({...draft, purpose:event.target.value})}><option value="">All purposes</option>{terms(entries,'useCases').map(ref => <option value={ref.slug} key={ref.id}>{ref.label}</option>)}</select></label>
      <button className="btn pri" disabled={!ready} type="submit">Filter</button>
      {Object.values(filters).some(Boolean) && <a className="btn" href={href}>Clear filters</a>}
    </form>
    <p className="dek" role="status">{rows.length} of {entries.length} website cases</p>
  </>;
  const tabs = <nav className="website-view-tabs" aria-label={presentation==='findings'?'Website purposes':'Related Website views'}>{navigation.map(ref=><a className="chip" key={ref.id} href={ref.href} aria-current={href===ref.href?'page':undefined}>{ref.label} <small>{ref.count}</small></a>)}</nav>;
  return <>
    {presentation==='anthology' ? <CollectionSignatureHero items={entries.map(row=>({id:row.id,title:row.title,src:row.cover}))} locale={locale} title={title} label={`${title} website cases`} line1={`${entries.length} website ${entries.length===1?'case':'cases'} to explore`} line2="Pick a project. Follow the source."><div className="msh-composer">{controls}</div>{tabs}</CollectionSignatureHero> : presentation==='findings' ? <div className="ctrl"><div className="wrap"><div className="bar"><div className="row"><span className="lbl">Task</span>{tabs}</div><div className="row"><span className="lbl">Within</span>{controls}</div></div></div></div> : <section className="sec"><h2>Narrow the deck</h2>{controls}</section>}
    {rows.length ? <WebsiteCaseResults rows={rows} presentation={presentation} promptTexts={promptTexts} topics={topics} /> : <section className="sec website-empty"><div className="empty"><h2>No website case matches those filters.</h2><a className="btn" href={href}>Browse all cases</a></div></section>}
  </>;
}
