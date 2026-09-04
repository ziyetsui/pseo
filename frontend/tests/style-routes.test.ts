import { modelFamilies } from "../src/lib/catalog/model-families";
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HubBrowse, DeckBrowse } from '../src/components/Browse';
import { createFixtureCatalog } from '../src/lib/catalog/fixture';
import { filterPrompts, styleHref, taskHref } from '../src/lib/catalog/query';
import { catalogPaths, styleForPath } from '../src/site/routes';
import { siteMetadata } from '../src/site/metadata';

const catalog = createFixtureCatalog('zh-CN');
afterEach(() => vi.unstubAllEnvs());

describe('Browse by style route boundary', () => {
  it('exports each real style once and resolves only its exact locale and path', () => {
    const paths = catalogPaths(catalog);
    for (const style of catalog.styles) {
      const path = styleHref(catalog.locale, style.slug);
      expect(paths.filter(candidate => candidate === path)).toHaveLength(1);
      expect(styleForPath(catalog, path)).toBe(style);
      expect(filterPrompts(catalog, { style: [style.slug] })).toHaveLength(style.count);
    }
    expect(styleForPath(catalog, '/zh-CN/prompts/styles/photorealistic')?.count).toBe(27);
    for (const path of [
      '/zh-CN/prompts/styles/missing-style',
      '/en/prompts/styles/photorealistic',
      '/zh-CN/prompts?style=photorealistic',
      '/zh-CN/prompts/use-cases/beauty',
      '/zh-CN/prompts/models/nano-banana-pro',
    ]) expect(styleForPath(catalog, path)).toBeNull();
    // Public API refs already carry the canonical style path; no duplicate export.
    const canonicalCatalog = { ...catalog, styles: catalog.styles.map(style => ({ ...style, href: styleHref(catalog.locale, style.slug) })) };
    expect(catalogPaths(canonicalCatalog)).toEqual(paths);
  });

  it('routes style cards to Plate while preserving ordinary style filters and other card destinations', () => {
    const hub = parse(renderToStaticMarkup(createElement(HubBrowse, { catalog })));
    const cards = hub.querySelectorAll('#styles a.tile');
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      const style = styleForPath(catalog, card.getAttribute('href') ?? '');
      expect(style).not.toBeNull();
      expect(card.querySelector('h3')?.text).toBe(style?.label);
    }
    for (const card of hub.querySelectorAll('#tasks a.tile')) {
      expect(catalog.useCases.some(task => taskHref(catalog.locale, task.slug) === card.getAttribute('href'))).toBe(true);
    }
    for (const card of hub.querySelectorAll('#models a.tile')) {
      expect(modelFamilies(catalog).some(model => model.href === card.getAttribute('href'))).toBe(true);
    }
    const style = catalog.styles.find(style => style.slug === 'photorealistic')!;
    expect(style.href).toBe('/zh-CN/prompts?style=photorealistic');
    const deck = parse(renderToStaticMarkup(createElement(DeckBrowse, { catalog, prompts: catalog.prompts })));
    const hrefs = deck.querySelectorAll('a').map(link => link.getAttribute('href'));
    expect(hrefs).toContain(style.href);
    expect(hrefs).not.toContain(styleHref(catalog.locale, style.slug));
  });

  it('keeps fixture styles noindex and uses approved entity SEO when supplied', () => {
    vi.stubEnv('FRONTEND_SITE_URL', 'https://example.com');
    const style = catalog.styles.find(style => style.slug === 'photorealistic')!;
    const path = styleHref(catalog.locale, style.slug);
    const publicCatalog = { ...catalog, mode: 'public-api' as const };
    expect(siteMetadata(catalog, path, `${style.label} prompts`, undefined, style).robots).toEqual({ index: false, follow: false });
    const metadata = siteMetadata(publicCatalog, path, `${style.label} prompts`, undefined, style);
    expect(metadata.title).toBe('Photorealistic prompts · Prompt Library');
    expect(metadata.robots).toMatchObject({ index: false });
    const seo = {
      title: 'Approved style title', description: 'Approved style description',
      canonicalUrl: `https://example.com${path}`, hreflang: { 'zh-CN': `https://example.com${path}` },
      robots: 'index,follow' as const,
    };
    const approved = siteMetadata(publicCatalog, path, `${style.label} prompts`, undefined, { ...style, seo });
    expect(approved.title).toBe('Approved style title');
    expect(approved.description).toBe(seo.description);
    expect(approved.alternates).toEqual({ canonical: seo.canonicalUrl, languages: seo.hreflang });
    expect(approved.robots).toEqual({ index: true, follow: true });
  });
});
