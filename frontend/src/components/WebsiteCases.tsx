import type { Catalog, WebsiteCase, WebsiteView } from '@/lib/catalog/types';
import { websiteRef } from '@/lib/catalog/website';
import { websiteViewEntries, websiteViewsForCase } from '@/lib/catalog/website-views';
import { WebsiteViews } from './WebsiteViews';
import { SiteHeader, SiteFooter } from './Chrome';
import { WebsiteCasesReader } from './WebsiteCasesReader';

export function WebsiteGallery({ catalog }: { catalog: Catalog }) {
  return <WebsiteViews catalog={catalog} />;
}
export function WebsiteViewGallery({ catalog, view }: { catalog: Catalog; view: WebsiteView }) {
  const entries = websiteViewEntries(catalog, view);
  return <div className="prototype-magnetic website-library"><div className="taste"><SiteHeader level="hub" locale={catalog.locale} sectionNavigation="library" /><main id="main">
    <section className="wrap sec"><p className="dek"><a href={websiteRef(catalog).href}>Explore Website views</a></p><div className="sec-h"><h1>{view.label}</h1></div><p className="dek">{view.count} website cases{view.axis === 'all' ? ' across the complete collection' : ` in this ${view.axis === 'use-case' ? 'purpose' : view.axis === 'tool' ? 'technology' : 'model'} view`}. Explore their previews, sources and available project links.</p>
      <WebsiteCasesReader entries={entries} href={view.href} />
    </section></main><SiteFooter catalog={catalog} /></div></div>;
}
export function WebsiteCaseDetail({ catalog, entry }: { catalog: Catalog; entry: WebsiteCase }) {
  const href = websiteRef(catalog).href;
  return <div className="prototype-magnetic website-library"><div className="taste"><SiteHeader level="prompt" locale={catalog.locale} /><main id="main"><article className="wrap sec website-detail">
    <p className="dek"><a href={href}>Explore Website views</a></p><h1>{entry.title}</h1><p className="dek">{entry.summary}</p>
    <p><a href={entry.source.url} target="_blank" rel="noopener noreferrer nofollow">{entry.attribution || 'Original source'} ↗</a></p>
    <figure>{entry.cover && <img src={entry.cover} alt={entry.title} width={960} height={600} />}</figure>
    <section><h2>Explore the project</h2><div className="website-actions"><a className="btn pri" href={entry.source.url} target="_blank" rel="noopener noreferrer nofollow">View original source ↗</a>{entry.demoUrl && <a className="btn" href={entry.demoUrl} target="_blank" rel="noopener noreferrer nofollow">Open demo ↗</a>}{entry.codeUrl && <a className="btn" href={entry.codeUrl} target="_blank" rel="noopener noreferrer nofollow">View code ↗</a>}</div></section>
    <section><h2>Prompt</h2>{entry.promptHref ? <a className="btn" href={entry.promptHref}>Read the supplied prompt</a> : <p className="dek">No prompt was included in the collected source. Follow the original post for the author’s project notes.</p>}</section>
    <section><h2>Related views</h2><div className="website-actions">{websiteViewsForCase(catalog, entry.id).map(view => <a className="chip" key={view.id} href={view.href}>{view.label} · {view.count} {view.count === 1 ? 'case' : 'cases'}</a>)}</div>{entry.tools.length > 0 && <p className="dek">{entry.tools.join(' · ')}</p>}</section>
    {entry.relatedSources.length > 0 && <section><h2>More from the source</h2><ul>{entry.relatedSources.map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer nofollow">Related source post ↗</a></li>)}</ul></section>}
  </article></main><SiteFooter catalog={catalog} /></div></div>;
}
