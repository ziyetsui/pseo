import type { Catalog, WebsiteCase } from '@/lib/catalog/types';
import { websiteEntries, websiteRef } from '@/lib/catalog/website';
import { SiteHeader, SiteFooter } from './Chrome';
import { WebsiteCasesReader } from './WebsiteCasesReader';

export function WebsiteGallery({ catalog }: { catalog: Catalog }) {
  const entries = websiteEntries(catalog);
  return <div className="prototype-magnetic website-library"><div className="taste"><SiteHeader level="hub" locale={catalog.locale} sectionNavigation="library" /><main id="main">
    <section className="wrap sec"><div className="sec-h"><h1>Website cases</h1></div><p className="dek">Explore real websites, browser scenes and interactive experiments. Every case keeps its source, creator credit and available project links.</p>
      <WebsiteCasesReader entries={entries} href={websiteRef(catalog).href} />
    </section></main><SiteFooter catalog={catalog} /></div></div>;
}
export function WebsiteCaseDetail({ catalog, entry }: { catalog: Catalog; entry: WebsiteCase }) {
  const href = websiteRef(catalog).href;
  return <div className="prototype-magnetic website-library"><div className="taste"><SiteHeader level="prompt" locale={catalog.locale} /><main id="main"><article className="wrap sec website-detail">
    <p className="dek"><a href={href}>Website cases</a></p><h1>{entry.title}</h1><p className="dek">{entry.summary}</p>
    <p><a href={entry.source.url} target="_blank" rel="noopener noreferrer nofollow">{entry.attribution || 'Original source'} ↗</a></p>
    <figure>{entry.cover && <img src={entry.cover} alt={entry.title} width={960} height={600} />}</figure>
    <section><h2>Explore the project</h2><div className="website-actions"><a className="btn pri" href={entry.source.url} target="_blank" rel="noopener noreferrer nofollow">View original source ↗</a>{entry.demoUrl && <a className="btn" href={entry.demoUrl} target="_blank" rel="noopener noreferrer nofollow">Open demo ↗</a>}{entry.codeUrl && <a className="btn" href={entry.codeUrl} target="_blank" rel="noopener noreferrer nofollow">View code ↗</a>}</div></section>
    <section><h2>Prompt</h2>{entry.promptHref ? <a className="btn" href={entry.promptHref}>Read the supplied prompt</a> : <p className="dek">No prompt was included in the collected source. Follow the original post for the author’s project notes.</p>}</section>
    <section><h2>Related topics</h2><div className="website-actions">{entry.models.map(ref => <a className="chip" key={ref.id} href={`${href}?model=${encodeURIComponent(ref.slug)}`}>{ref.label}</a>)}{entry.useCases.filter(ref => ref.slug !== 'website').map(ref => <a className="chip" key={ref.id} href={`${href}?purpose=${encodeURIComponent(ref.slug)}`}>{ref.label}</a>)}</div>{entry.tools.length > 0 && <p className="dek">{entry.tools.join(' · ')}</p>}</section>
    {entry.relatedSources.length > 0 && <section><h2>More from the source</h2><ul>{entry.relatedSources.map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer nofollow">Related source post ↗</a></li>)}</ul></section>}
  </article></main><SiteFooter catalog={catalog} /></div></div>;
}
