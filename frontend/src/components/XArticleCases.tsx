import '@/styles/x-articles.css';
import Image from 'next/image';
import { SiteFooter, SiteHeader } from './Chrome';
import { generationHref } from '@/lib/cta/generation-url';
import { xArticles, xArticleCreators, xArticleCreatorHref, xArticleGraph, xArticleHref, xArticlePath, xArticleTextLanguage, type XArticleCase } from '@/lib/catalog/x-articles';
import type { Catalog } from '@/lib/catalog/types';

const copy = (locale: string, en: string, zh: string) => locale === 'zh-CN' ? zh : en;
const compact = (value: number, locale: string) => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const date = (value: string, locale: string) => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));

function ArticlePoster({ article, compactMode = false }: { article: XArticleCase; compactMode?: boolean }) {
  if (article.cover) return <div className={`xa-cover${compactMode ? ' xa-cover-small' : ''}`}>
    <Image src={article.cover.src} width={article.cover.width} height={article.cover.height} alt="" unoptimized loading={compactMode && article.rank > 3 ? 'lazy' : 'eager'} />
  </div>;
  return <div className={`xa-poster${compactMode ? ' xa-poster-small' : ''}`} aria-hidden="true">
    <span className="xa-poster-top">X / ARTICLE <span>№ {String(article.rank).padStart(3, '0')}</span></span>
    <strong lang={xArticleTextLanguage(article)}>{article.title}</strong>
    <span className="xa-poster-bottom">@{article.authorHandle}<span>ANCHER / ARCHIVE</span></span>
  </div>;
}

function ArticleCard({ article, catalog }: { article: XArticleCase; catalog: Catalog }) {
  return <a className="xa-card" href={xArticleHref(catalog.locale, article)}>
    <ArticlePoster article={article} compactMode />
    <div className="xa-card-meta"><span>#{String(article.rank).padStart(3, '0')} · @{article.authorHandle}</span><span>♥ {compact(article.likes, catalog.locale)}</span></div>
    <h3 lang={xArticleTextLanguage(article)}>{article.title}</h3>
  </a>;
}

export function XArticleGallery({ catalog, handle }: { catalog: Catalog; handle?: string }) {
  const authoredIds = handle ? new Set(xArticleGraph.edges.filter(edge => edge.type === 'authored_by' && edge.to === `creator:${handle}`).map(edge => edge.from.slice('article:'.length))) : null;
  const rows = authoredIds ? xArticles.filter(article => authoredIds.has(article.id)) : xArticles;
  const creator = xArticleCreators.find(item => item.handle === handle);
  const currentHref = handle ? xArticleCreatorHref(catalog.locale, handle) : xArticlePath(catalog.locale);
  return <div className="xa-shell prototype-deck"><SiteHeader level="deck" locale={catalog.locale} currentHref={currentHref} bilingual contentType="article" />
    <main id="main" className="xa-main"><header className="xa-index-head">
      <p className="xa-kicker">{copy(catalog.locale, 'X ARTICLE CASES / SORTED BY LIKES', 'X 爆款文章案例 / 按点赞数排序')}</p>
      <h1>{creator ? creator.name : copy(catalog.locale, 'Writing that travelled', '被广泛传播的文章')}</h1>
      <p>{creator ? `@${creator.handle} · ${rows.length} ${copy(catalog.locale, 'articles', '篇文章')}` : copy(catalog.locale, `${rows.length} verified X Articles, ranked by observed likes. Open a case to read the original and make a writing prompt.`, `${rows.length} 篇已核实的 X Article，按抓取时的点赞数排序。打开案例阅读原文，并生成写作提示词。`)}</p>
      <span>{copy(catalog.locale, 'Metrics observed 16 Oct 2026 · may change on X', '数据采集于 2026 年 10 月 16 日 · X 上的数值可能变化')}</span>
    </header>
    {!handle && <nav className="xa-creator-nav" aria-label={copy(catalog.locale, 'Browse by author', '按作者浏览')}>
      <span>{copy(catalog.locale, 'AUTHORS', '作者')}</span>{xArticleCreators.slice(0, 12).map(item => <a key={item.handle} href={xArticleCreatorHref(catalog.locale, item.handle)}>@{item.handle} <small>{item.count}</small></a>)}
    </nav>}
    <section className="xa-grid" aria-label={copy(catalog.locale, 'Article cases', '文章案例')}>
      {rows.map(article => <ArticleCard key={article.id} article={article} catalog={catalog} />)}
    </section>
    {handle && <a className="xa-back" href={xArticlePath(catalog.locale)}>{copy(catalog.locale, '← All articles', '← 全部文章')}</a>}
    </main><SiteFooter catalog={catalog} level="deck" /></div>;
}

function writingPrompt(article: XArticleCase, task: 'distill' | 'remix', locale: string): string {
  const context = `Original X Article: ${article.title}\nAuthor: @${article.authorHandle}\nSource: ${article.sourceUrl}`;
  const excerpt = article.body.slice(0, 600).trim();
  if (locale === 'zh-CN') return task === 'distill'
    ? `请分析以下 X Article 的写作方法，而不是复述或复制原文。提炼其开头钩子、论证节奏、段落转折、具体例子和结尾行动号召，给出可复用的原创写作框架。\n\n${context}\n\n开头节选：\n${excerpt}`
    : `请借鉴以下 X Article 的写作结构，为我创作一篇主题和表达均不同的新文章。先询问我的主题、目标读者与独特经验；不要复用原文句子或事实。\n\n${context}\n\n开头节选：\n${excerpt}`;
  return task === 'distill'
    ? `Analyze the writing craft of this X Article. Extract the opening hook, argument rhythm, transitions, examples, and ending into an original reusable framework. Do not reproduce the article.\n\n${context}\n\nOpening excerpt:\n${excerpt}`
    : `Use the structure of this X Article to help me write a new article on a different topic. First ask for my topic, audience, and firsthand experience. Do not reuse the original sentences or claims.\n\n${context}\n\nOpening excerpt:\n${excerpt}`;
}

function ArticleBlock({ value }: { value: string }) {
  const heading = value.match(/^(#{1,4})\s+(.+)$/u);
  if (heading) return <h3>{heading[2]}</h3>;
  if (value.startsWith('> ')) return <blockquote>{value.replace(/^>\s?/gmu, '')}</blockquote>;
  return <p>{value}</p>;
}

export function XArticleDetail({ catalog, article }: { catalog: Catalog; article: XArticleCase }) {
  const locale = catalog.locale;
  const paragraphs = article.body.split(/\n\s*\n/u).map(item => item.trim()).filter(Boolean);
  return <div className="xa-shell prototype-recipe"><SiteHeader level="prompt" locale={locale} currentHref={xArticleHref(locale, article)} bilingual />
    <main id="main" className="xa-main xa-detail">
      <nav className="xa-crumb" aria-label={copy(locale, 'Article navigation', '文章导航')}><a href={xArticlePath(locale)}>{copy(locale, 'Articles', '爆款文章')}</a><span>/</span><span>#{String(article.rank).padStart(3, '0')}</span></nav>
      <header className="xa-detail-hero"><ArticlePoster article={article} /><div className="xa-hero-aside">
        <p className="xa-kicker">X ARTICLE / № {String(article.rank).padStart(3, '0')}</p>
        <h1 lang={xArticleTextLanguage(article)}>{article.title}</h1>
        <a href={xArticleCreatorHref(locale, article.authorHandle)} className="xa-author">{article.authorName} · @{article.authorHandle}</a>
        <div className="xa-stats"><div><span>{copy(locale, 'Published', '发布')}</span><b>{date(article.publishedAt, locale)}</b></div><div><span>{copy(locale, 'Likes at capture', '采集时点赞')}</span><b>{article.likes.toLocaleString(locale)}</b></div><div><span>{copy(locale, 'Bookmarks', '收藏')}</span><b>{article.bookmarks.toLocaleString(locale)}</b></div><div><span>{copy(locale, 'Reposts', '转发')}</span><b>{article.reposts.toLocaleString(locale)}</b></div></div>
        <div className="xa-actions"><a className="xa-primary" href={generationHref(writingPrompt(article, 'distill', locale))} target="_blank" rel="noopener noreferrer">{copy(locale, 'Distill writing style ↗', '蒸馏写法 ↗')}</a><a href={generationHref(writingPrompt(article, 'remix', locale))} target="_blank" rel="noopener noreferrer">{copy(locale, 'Make a new article ↗', '二次创作 ↗')}</a></div>
        <p className="xa-note">{copy(locale, 'The buttons send an editable prompt to Ancher, not the full article.', '按钮会将可编辑提示词发送到 Ancher，不会传送整篇原文。')}</p>
      </div></header>
      <div className="xa-reading"><aside><span>{copy(locale, 'ORIGINAL TEXT', '原文')}</span><a href={article.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">{copy(locale, 'Read on X ↗', '在 X 阅读 ↗')}</a><small>{copy(locale, 'Original language · credited to the author', '保留原文语言 · 署名归原作者')}</small></aside>
        <article lang={xArticleTextLanguage(article)}><h2>{article.title}</h2>{paragraphs.map((paragraph, index) => <ArticleBlock key={index} value={paragraph} />)}<div className="xa-source-end"><span>{copy(locale, 'SOURCE', '来源')}</span><a href={article.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">@{article.authorHandle} / X ↗</a></div></article>
      </div>
    </main><SiteFooter catalog={catalog} level="prompt" /></div>;
}
