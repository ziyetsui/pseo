import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { siteMetadata } from '@/site/metadata';
import { HubBrowse } from '@/components/Browse';
import { createFixtureCatalog } from '@/lib/catalog/fixture';
import { websitePrompts, websiteRef } from '@/lib/catalog/website';
import { catalogPaths } from '@/site/routes';
import type { Ref } from '@/lib/catalog/types';

afterEach(() => vi.unstubAllEnvs());
const catalog = createFixtureCatalog('zh-CN');
const task = (slug: string): Ref => ({ id: `task:${slug}`, slug, label: slug, href: `/zh-CN/prompts/use-cases/${slug}`, count: 99 });

describe('Website category', () => {
  it('renders the third category with a real exported URL and current deduplicated count', () => {
    const html = parse(renderToStaticMarkup(<HubBrowse catalog={catalog} />));
    const tiles = html.querySelectorAll('#category a.tile');
    expect(tiles).toHaveLength(3);
    const link = tiles.find(tile => tile.querySelector('h3')?.text === 'Website');
    expect(link?.getAttribute('href')).toBe('/zh-CN/prompts/website');
    expect(link?.querySelector('p')?.text).toBe('1 prompt');
    expect(catalogPaths(catalog)).toContain('/zh-CN/prompts/website');
    vi.stubEnv('FRONTEND_SITE_URL', 'https://example.com');
    expect(siteMetadata({ ...catalog, mode: 'public-api' }, websiteRef(catalog).href, 'Website prompts').robots).toEqual({ index: false, follow: false });
  });
  it('selects explicit website tasks across media kinds and deduplicates immutable IDs', () => {
    const base = catalog.prompts[0];
    if (!base) throw new Error('Test fixture needs a prompt');
    const image = { ...base, id: 'image', kind: 'image' as const, useCases: [task('website')] };
    const video = { ...base, id: 'video', kind: 'video' as const, useCases: [task('web-motion-design')] };
    const text = { ...base, id: 'text', kind: 'text' as const, useCases: [task('web-development'), task('web-design')] };
    const unrelated = { ...base, id: 'unrelated', title: 'Website screenshot', useCases: [task('product-marketing')] };
    expect(websitePrompts({ ...catalog, prompts: [image, video, text, image, unrelated] }).map(p => p.id)).toEqual(['image', 'video', 'text']);
  });
  it('keeps empty website collections addressable without using unrelated previews or stale counts', () => {
    const empty = { ...catalog, prompts: [] };
    const html = parse(renderToStaticMarkup(<HubBrowse catalog={empty} />));
    const tile = html.querySelector('#category a[href="/zh-CN/prompts/website"]');
    expect(tile?.querySelector('p')?.text).toBe('0 prompts');
    expect(tile?.querySelector('img')).toBeNull();
    expect(websiteRef(empty).count).toBe(0);
    expect(catalogPaths(empty)).toContain('/zh-CN/prompts/website');
  });
});
