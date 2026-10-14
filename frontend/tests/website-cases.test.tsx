import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { WebsiteCaseDetail, WebsiteGallery } from '@/components/WebsiteCases';
import { filterWebsiteCases } from '@/lib/catalog/website-filter';

const catalog = createGitBetaCatalog('zh-CN');
describe('real website cases', () => {
  it('server-renders all website entries with real previews and honest missing-preview states', () => {
    const html = parse(renderToStaticMarkup(<WebsiteGallery catalog={catalog} />));
    expect(html.querySelectorAll('[data-website-case]')).toHaveLength(193);
    expect(html.querySelectorAll('[data-website-case] img')).toHaveLength(60);
    expect(html.querySelector('h1')?.text).toBe('Website cases');
  });
  it('keeps a missing prompt out of the detail actions and preserves its original source', () => {
    const entry = catalog.websites?.find(item => !item.promptHref);
    if (!entry) throw new Error('Missing case test input');
    const html = parse(renderToStaticMarkup(<WebsiteCaseDetail catalog={catalog} entry={entry} />));
    expect(html.querySelector('h1')?.text).toBe(entry.title);
    expect(html.querySelectorAll('a').some(link => link.getAttribute('href') === entry.source.url)).toBe(true);
    expect(html.querySelector('[data-generation-cta]')).toBeNull();
    expect(html.text).toContain('No prompt was included');
  });
  it('searches real titles and scopes model/purpose filters with an empty result for impossible queries', () => {
    const rows = catalog.websites ?? [];
    expect(filterWebsiteCases(rows, { q: 'Halloween pool' }).map(item => item.title)).toEqual(['Halloween pool party']);
    expect(filterWebsiteCases(rows, { model: 'claude' }).every(item => item.models.some(ref => ref.slug === 'claude'))).toBe(true);
    expect(filterWebsiteCases(rows, { purpose: 'website-fun' }).every(item => item.useCases.some(ref => ref.slug === 'website-fun'))).toBe(true);
    expect(filterWebsiteCases(rows, { q: 'no-website-will-match-this' })).toEqual([]);
  });
});

it('uses the actual case title in browser metadata rather than the generic library title', async () => {
  const { siteMetadata } = await import('@/site/metadata');
  const entry = catalog.websites?.[0];
  if (!entry) throw new Error('Missing case input');
  expect(siteMetadata(catalog, entry.href, entry.title).title).toBe(`${entry.title} · Prompt Library`);
});
