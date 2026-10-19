import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { XArticleDetail, XArticleGallery } from '@/components/XArticleCases';
import { xArticles } from '@/lib/catalog/x-articles';
import type { Catalog } from '@/lib/catalog/types';
vi.mock('@/components/Chrome', () => ({ SiteHeader: () => null, SiteFooter: () => null }));
const catalog: Catalog = { locale: 'zh-CN', mode: 'git-beta', revision: 'test', observedAt: null, prompts: [], models: [], useCases: [], techniques: [], styles: [], subjects: [], collections: [], creators: [], locales: [] };
describe('original X Article covers', () => {
  it('uses the same original cover in the gallery, author gallery and detail', () => {
    const article = xArticles[0]!;
    for (const element of [<XArticleGallery key="all" catalog={catalog} />, <XArticleGallery key="author" catalog={catalog} handle={article.authorHandle} />, <XArticleDetail key="detail" catalog={catalog} article={article} />]) {
      expect(renderToStaticMarkup(element)).toContain(`/x-article-covers/${article.id}.jpg`);
    }
  });
  it('retains a text poster when the original article has no cover', () => {
    const article = xArticles.find(article => article.id === '2096721302568796627')!;
    expect(article.cover).toBeNull();
    expect(renderToStaticMarkup(<XArticleDetail catalog={catalog} article={article} />)).toContain('xa-poster');
  });
});
