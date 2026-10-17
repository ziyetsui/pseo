import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { websiteViews } from '@/lib/catalog/website-views';
import { WebsiteGallery, WebsiteViewGallery, WebsiteCaseDetail } from '@/components/WebsiteCases';
import { SiteFooter } from '@/components/Chrome';
import { catalogPaths } from '@/site/routes';
const catalog = createGitBetaCatalog('zh-CN'), views = websiteViews(catalog);
const html = (node: React.ReactNode) => parse(renderToStaticMarkup(node));
describe('Website prototype levels and navigation', () => {
  it('uses Deck for Website entry while retaining independent view navigation', () => {
    const root = html(<WebsiteGallery catalog={catalog} />);
    expect(root.querySelector('.prototype-deck .v4 .deck')).not.toBeNull();
    expect(root.querySelectorAll('[data-website-view]')).toHaveLength(43);
    expect(root.querySelectorAll('[data-website-case]')).toHaveLength(0);
  });
  it('uses Findings for purposes and Signature/Anthology for models and technologies', () => {
    for (const view of views.filter(view => view.axis !== 'all')) {
      const root = html(<WebsiteViewGallery catalog={catalog} view={view} />);
      expect(root.querySelector(view.axis === 'use-case' ? '.prototype-task-findings .finding' : '.prototype-anthology .model-signature')).not.toBeNull();
      expect(root.querySelectorAll('[data-website-case]')).toHaveLength(view.count);
    }
  });
  it('uses the four Recipe steps even when the collected case has no prompt', () => {
    const entry = catalog.websites!.find(entry => !entry.promptHref)!;
    const root = html(<WebsiteCaseDetail catalog={catalog} entry={entry} />);
    expect(root.querySelector('.prototype-recipe .v3')).not.toBeNull();
    expect(root.querySelectorAll('.step .num').map(el => el.text)).toEqual(['01','02','03','04']);
    expect(Boolean(root.querySelector('[data-generation-cta]'))).toBe(true);
    expect(root.querySelectorAll('.varopts input').length).toBeGreaterThan(0);
  });
  it('keeps Website views in the directory and links to the complete Library index from the footer', () => {
    const root = html(<SiteFooter catalog={catalog} />), links = new Set(root.querySelectorAll('a').map(el=>el.getAttribute('href')));
    expect(links.has('/zh-CN/prompts/website')).toBe(true);
    expect(links.size).toBeLessThanOrEqual(29);
    expect(links.has('/zh-CN/prompts/articles')).toBe(true);
    expect(links.has('/zh-CN/prompts/library-index')).toBe(true);
    expect(catalogPaths(catalog)).toContain('/zh-CN/prompts/library-index');
  });
});
