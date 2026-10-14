import type { Catalog, WebsiteViewAxis } from '@/lib/catalog/types';
import { websiteViews, websiteViewEntries } from '@/lib/catalog/website-views';
import { websiteRef } from '@/lib/catalog/website';
import { SiteHeader, SiteFooter } from './Chrome';
import { WebsiteDeck } from './WebsiteDeck';

const sections: { axis: WebsiteViewAxis; label: string; description: string }[] = [
  { axis: 'use-case', label: 'Browse by purpose', description: 'Find projects for the work you want to do.' },
  { axis: 'model', label: 'Browse by model', description: 'Explore projects associated with each coding model.' },
  { axis: 'tool', label: 'Browse by technology', description: 'Explore the tools and technologies used in these projects.' },
  { axis: 'all', label: 'The complete collection', description: 'Browse every website case in one view.' },
];
export function WebsiteViews({ catalog }: { catalog: Catalog }) {
  const views = websiteViews(catalog);
  return <div className="prototype-deck website-aligned"><div className="v4 taste"><SiteHeader level="deck" locale={catalog.locale} contentType="website" /><main id="main"><div className="wrap">
    <header className="hero"><p className="eyebrow">Website gallery</p><h1 className="tier-index">Website views</h1><p className="lede">Explore {websiteRef(catalog).count} website cases by purpose, model or technology. Pick a view to discover related projects.</p></header>
    <section className="sec"><div className="sec-head"><h2>Explore a view</h2><span className="count">{views.length} views</span></div><WebsiteDeck kind="view" items={views.map(view=>({id:view.id,title:view.label,href:view.href,cover:websiteViewEntries(catalog,view).find(entry=>entry.cover)?.cover??'',summary:`Explore ${view.count} website ${view.count===1?'case':'cases'} in this ${view.axis==='all'?'complete collection':view.axis==='use-case'?'purpose':view.axis==='tool'?'technology':'model'} view.`,caption:`${view.count} ${view.count===1?'case':'cases'}`}))} /></section>
    {sections.map(section => {
      const rows = views.filter(view => view.axis === section.axis);
      if (!rows.length) return null;
      return <section className="sec website-browse" key={section.axis}><div className="sec-head"><h2>{section.label}</h2></div><p className="subline">{section.description}</p><ul className="entry">{rows.map(view => <li key={view.id}>
        <a className="nm" href={view.href} data-website-view={view.id} data-view-axis={view.axis} data-view-target={view.targetId ?? ''} data-view-count={view.count}>{view.label} <span>{view.count} {view.count === 1 ? 'case' : 'cases'}</span></a><a className="go" href={view.href}>Explore this view →</a>
      </li>)}</ul></section>;
    })}
  </div></main><SiteFooter catalog={catalog} level="deck" /></div></div>;
}
