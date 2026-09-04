import type { Catalog } from '@/lib/catalog/types';
import { SiteFooter, SiteHeader } from './Chrome';
import { loadArticleSite, type ArticleCategory, type ArticleDetail, type ArticleSite, type ArticleSummary } from '@/site/articles';
import { BlogBody } from './BlogBody';

function ArticleList({ articles }: { articles: ArticleSummary[] }) {
  return <div className="blog-list">{articles.map(article => <article className="blog-list-item" key={article.id}>
    {article.cover && <a href={article.href} tabIndex={-1} aria-hidden="true"><img src={article.cover.url} alt="" width={article.cover.width} height={article.cover.height} loading="lazy" /></a>}
    <div><p className="eyebrow"><a href={article.category.href} lang={article.locale}>{article.category.name}</a> · {article.readingTimeMinutes} min read</p><h2 lang={article.locale}><a href={article.href}>{article.title}</a></h2><p lang={article.locale}>{article.excerpt}</p><p className="metrics">{article.author.name} · <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</time></p></div>
  </article>)}</div>;
}

/** Derived design; a missing data source is different from a verified empty public snapshot. */
export async function Blog({ catalog, site: suppliedSite }: { catalog: Catalog; site?: ArticleSite }) {
  const site = suppliedSite ?? await loadArticleSite(catalog);
  return <div className="prototype-hub"><div className="taste"><SiteHeader locale={catalog.locale} level="deck" />
    <main id="main" className="wrap"><section className="sec"><p className="eyebrow">Field notes</p><h1 className="tier-index">The notebook</h1><p className="dek">Notes on prompts, their results, and how to work with them.</p></section>
      {site.state === 'unavailable' ? <div className="empty"><h2>The notebook is unavailable</h2><p>Articles are not available on this version of the site. You can still browse the prompt library.</p><a className="btn pri" href={`/${catalog.locale}/prompts`}>Browse the library →</a></div> : site.articles.length ? <ArticleList articles={site.articles} /> : <div className="empty"><h2>No articles published yet</h2><p>In the meantime, find a prompt and make something of your own.</p><a className="btn pri" href={`/${catalog.locale}/prompts`}>Browse the library →</a></div>}
    </main><SiteFooter catalog={catalog} /></div></div>;
}

export function BlogArticle({ catalog, article }: { catalog: Catalog; article: ArticleDetail }) {
  return <div className="prototype-hub"><div className="taste"><SiteHeader locale={catalog.locale} level="deck" />
    <main id="main" className="wrap blog-article">
      <header className="sec"><p className="eyebrow">{article.summary.category.name} · {article.summary.readingTimeMinutes} min read</p><h1 className="tier-index" lang={article.summary.locale}>{article.summary.title}</h1><p className="dek" lang={article.summary.locale}>{article.summary.excerpt}</p><p className="metrics">By {article.summary.author.name} · <time dateTime={article.summary.publishedAt}>{new Date(article.summary.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</time></p></header>
      {article.summary.cover && <img className="blog-cover" src={article.summary.cover.url} alt={article.summary.cover.alt} width={article.summary.cover.width} height={article.summary.cover.height} fetchPriority="high" />}
      {article.toc.length > 0 && <nav className="blog-toc" aria-label="On this page"><p className="eyebrow">On this page</p><ol>{article.toc.map(item => <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>)}</ol></nav>}
      <div lang={article.summary.locale}><BlogBody html={article.bodyHtml} /></div>
      {article.source && <section className="sec"><h2>Source</h2><p><a href={article.source.url} rel="noopener noreferrer nofollow">{article.source.authorHandle ?? article.source.platform} ↗</a></p><p>Observed <time dateTime={article.source.observedAt}>{article.source.observedAt}</time></p></section>}
      {article.citations.length > 0 && <section className="sec"><h2>References</h2><ol>{article.citations.map((item, index) => <li key={`${item.url}:${index}`}><a href={item.url} rel="noopener noreferrer">{item.label}</a></li>)}</ol></section>}
      {article.related.length > 0 && <section className="sec"><h2>Keep reading</h2><ArticleList articles={article.related} /></section>}
    </main><SiteFooter catalog={catalog} /></div></div>;
}

export function BlogCategory({ catalog, category }: { catalog: Catalog; category: ArticleCategory }) {
  return <div className="prototype-hub"><div className="taste"><SiteHeader locale={catalog.locale} level="deck" />
    <main id="main" className="wrap"><section className="sec"><a href={`/${catalog.locale}/blog`}>← The notebook</a><h1 className="tier-index" lang={catalog.locale}>{category.name}</h1><p className="dek" lang={catalog.locale}>{category.description}</p></section><ArticleList articles={category.items} /></main><SiteFooter catalog={catalog} /></div></div>;
}
