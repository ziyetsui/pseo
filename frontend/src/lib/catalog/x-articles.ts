import rows from '@/data/x-article-cases.json';
import covers from '@/data/x-article-covers.json';
import type { Locale } from './types';

export interface XArticleCase {
  cover: XArticleCover | null;
  id: string;
  rank: number;
  title: string;
  authorHandle: string;
  authorName: string;
  sourceUrl: string;
  publishedAt: string;
  observedAt: string;
  likes: number;
  bookmarks: number;
  reposts: number;
  replies: number;
  language: string;
  body: string;
  rights: 'review_required';
}

export interface XArticleCover {
  src: string;
  sourceImageUrl: string;
  width: number;
  height: number;
  sha256: string;
}
const coverAssets: Record<string, XArticleCover> = covers.assets;
export const xArticles: XArticleCase[] = rows.map(article => ({ ...article, rights: 'review_required', cover: coverAssets[article.id] ?? null }));
export const xArticlePath = (locale: Locale) => `/${locale}/prompts/articles`;
export const xArticleHref = (locale: Locale, article: XArticleCase) => `${xArticlePath(locale)}/${article.id}`;
export const xArticleCreatorHref = (locale: Locale, handle: string) => `${xArticlePath(locale)}/creators/${handle}`;

export const xArticleCreators = [...new Map(xArticles.map(article => [article.authorHandle, article.authorName])).entries()]
  .map(([handle, name]) => ({ handle, name, count: xArticles.filter(article => article.authorHandle === handle).length,
    topLikes: Math.max(...xArticles.filter(article => article.authorHandle === handle).map(article => article.likes)) }))
  .sort((a, b) => b.topLikes - a.topLikes);

/** Beta-only IA graph: article cases are separate from copyable Prompt entities. */
export const xArticleGraph = {
  nodes: [
    ...xArticles.map(article => ({ id: `article:${article.id}`, type: 'article-case', label: article.title })),
    ...xArticleCreators.map(creator => ({ id: `creator:${creator.handle}`, type: 'creator', label: creator.name })),
    ...xArticles.map(article => ({ id: `source:${article.id}`, type: 'source', label: article.sourceUrl })),
  ],
  edges: xArticles.flatMap(article => [
    { from: `article:${article.id}`, to: `creator:${article.authorHandle}`, type: 'authored_by' },
    { from: `article:${article.id}`, to: `source:${article.id}`, type: 'sourced_from' },
  ]),
};

export function xArticleTextLanguage(article: XArticleCase): string {
  if (/\p{Script=Hiragana}|\p{Script=Katakana}/u.test(article.title)) return 'ja';
  if (/\p{Script=Han}/u.test(article.title)) return 'zh';
  return article.language === 'zxx' || article.language === 'und' ? 'en' : article.language;
}
