import { describe, expect, it } from 'vitest';
import { generationHref } from '@/lib/cta/generation-url';
import { xArticles, xArticleCreators, xArticleCreatorHref, xArticleGraph, xArticleHref, xArticlePath } from '@/lib/catalog/x-articles';

describe('X Article beta cases', () => {
  it('keeps every verified source distinct and ranked by observed likes', () => {
    expect(xArticles).toHaveLength(105);
    expect(new Set(xArticles.map(article => article.id)).size).toBe(105);
    expect(xArticles[0]!.authorHandle).toBe('thedankoe');
    expect(xArticles.some(article => article.authorHandle === 'karpathy')).toBe(true);
    for (const [index, article] of xArticles.entries()) {
      expect(article.rank).toBe(index + 1);
      expect(article.likes).toBeGreaterThanOrEqual(xArticles[index + 1]?.likes ?? 0);
      expect(article.sourceUrl).toBe(`https://x.com/${article.authorHandle}/status/${article.id}`);
      expect(article.body.trim().length).toBeGreaterThan(0);
      expect(article.rights).toBe('review_required');
    }
  });

  it('has valid author and source edges for every case', () => {
    const nodeIds = new Set(xArticleGraph.nodes.map(node => node.id));
    expect(nodeIds.size).toBe(xArticleGraph.nodes.length);
    expect(xArticleGraph.edges).toHaveLength(xArticles.length * 2);
    for (const edge of xArticleGraph.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
    expect(xArticleCreators.reduce((total, creator) => total + creator.count, 0)).toBe(105);
  });

  it('provides stable bilingual collection, author and detail routes and a prompt handoff', () => {
    const article = xArticles[0]!;
    expect(xArticlePath('zh-CN')).toBe('/zh-CN/prompts/articles');
    expect(xArticleCreatorHref('zh-CN', article.authorHandle)).toBe('/zh-CN/prompts/articles/creators/thedankoe');
    expect(xArticleHref('en', article)).toBe(`/en/prompts/articles/${article.id}`);
    const url = new URL(generationHref(`Write about ${article.title}\n${article.sourceUrl}`));
    expect(url.origin).toBe('https://app.ancher.ai');
    expect(url.searchParams.get('prompts')).toContain(article.sourceUrl);
  });

});
