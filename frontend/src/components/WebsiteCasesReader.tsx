'use client';
import { useEffect, useState } from 'react';
import type { Ref, WebsiteCase } from '@/lib/catalog/types';
import { filterWebsiteCases, type WebsiteFilters } from '@/lib/catalog/website-filter';

function terms(rows: WebsiteCase[], axis: 'models' | 'useCases'): Ref[] {
  return [...new Map(rows.flatMap(item => item[axis]).filter(ref => ref.slug !== 'website').map(ref => [ref.slug, ref])).values()].sort((a,b) => a.label.localeCompare(b.label));
}
export function WebsiteCasesReader({ entries, href }: { entries: WebsiteCase[]; href: string }) {
  const [filters, setFilters] = useState<WebsiteFilters>({});
  const [draft, setDraft] = useState<WebsiteFilters>({});
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(location.search);
      const next = { q: params.get('q') ?? '', model: params.get('model') ?? '', purpose: params.get('purpose') ?? '' };
      setFilters(next); setDraft(next);
    };
    read(); window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  const rows = filterWebsiteCases(entries, filters);
  return <>
    <form className="website-filters" method="get" action={href} onSubmit={event => {
      event.preventDefault(); const data = new FormData(event.currentTarget), params = new URLSearchParams();
      for (const key of ['q', 'model', 'purpose']) { const value = String(data.get(key) ?? '').trim(); if (value) params.set(key,value); }
      const next = { q: params.get('q') ?? '', model: params.get('model') ?? '', purpose: params.get('purpose') ?? '' };
      history.pushState(null, '', `${href}${params.size ? `?${params}` : ''}`); setFilters(next); setDraft(next);
    }}>
      <label>Search cases<input name="q" type="search" value={draft.q ?? ''} onChange={event => setDraft({...draft, q:event.target.value})} placeholder="Search websites, tools or creators" /></label>
      <label>Model<select name="model" value={draft.model ?? ''} onChange={event => setDraft({...draft, model:event.target.value})}><option value="">All models</option>{terms(entries,'models').map(ref => <option value={ref.slug} key={ref.id}>{ref.label}</option>)}</select></label>
      <label>Purpose<select name="purpose" value={draft.purpose ?? ''} onChange={event => setDraft({...draft, purpose:event.target.value})}><option value="">All purposes</option>{terms(entries,'useCases').map(ref => <option value={ref.slug} key={ref.id}>{ref.label}</option>)}</select></label>
      <button className="btn pri" type="submit">Filter</button>
      {Object.values(filters).some(Boolean) && <a className="btn" href={href}>Clear filters</a>}
    </form>
    <p className="dek" role="status">{rows.length} of {entries.length} website cases</p>
    {!rows.length ? <div className="empty"><h2>No website case matches those filters.</h2><a className="btn" href={href}>Browse all cases</a></div> : <div className="tiles website-cases">{rows.map(item => <article className="tile" key={item.id} data-website-case={item.id}>
      <a className="th" href={item.href}>{item.cover ? <img src={item.cover} alt={item.title} width={560} height={350} loading="lazy" referrerPolicy="no-referrer" /> : <span className="media-fallback">No preview available.</span>}</a>
      <div className="tb"><h2><a href={item.href}>{item.title}</a></h2><p className="website-summary">{item.summary}</p><p><a href={item.source.url} target="_blank" rel="noopener noreferrer nofollow">{item.attribution || 'Original source'} ↗</a></p><p>{item.tools.join(' · ') || item.models.map(ref => ref.label).join(' · ') || 'Website case'}{item.promptHref ? ' · Prompt available' : ''}</p></div>
    </article>)}</div>}
  </>;
}
