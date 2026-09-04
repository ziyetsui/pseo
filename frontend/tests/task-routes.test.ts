import { modelFamilies } from "../src/lib/catalog/model-families";
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HubBrowse, DeckBrowse } from '../src/components/Browse';
import { createFixtureCatalog } from '../src/lib/catalog/fixture';
import { filterPrompts, styleHref, taskHref } from '../src/lib/catalog/query';
import { catalogPaths, taskForPath } from '../src/site/routes';
import { siteMetadata } from '../src/site/metadata';

const catalog = createFixtureCatalog('zh-CN');
afterEach(() => vi.unstubAllEnvs());

describe('Browse by task route boundary', () => {
  it('exports every real task route and resolves only the matching locale and task', () => {
    const paths = catalogPaths(catalog);
    for (const task of catalog.useCases) {
      const path = taskHref(catalog.locale, task.slug);
      expect(paths.filter(candidate => candidate === path)).toHaveLength(1);
      expect(taskForPath(catalog, path)).toBe(task);
      expect(filterPrompts(catalog, { useCase: [task.slug] })).toHaveLength(task.count);
    }
    const beauty = taskForPath(catalog, '/zh-CN/prompts/use-cases/beauty');
    expect(beauty?.label).toBe('Beauty');
    expect(beauty?.count).toBe(13);
    expect(taskForPath(catalog, '/zh-CN/prompts/use-cases/missing-task')).toBeNull();
    expect(taskForPath(catalog, '/en/prompts/use-cases/beauty')).toBeNull();
    expect(taskForPath(catalog, '/zh-CN/prompts?useCase=beauty')).toBeNull();
    expect(taskForPath(catalog, '/zh-CN/prompts/models/nano-banana-pro')).toBeNull();
  });

  it('keeps task and style card destinations separate while preserving model and ordinary tag links', () => {
    const hub = parse(renderToStaticMarkup(createElement(HubBrowse, { catalog })));
    const taskLinks = hub.querySelectorAll('#tasks a.tile');
    expect(taskLinks.length).toBeGreaterThan(0);
    for (const link of taskLinks) {
      const task = taskForPath(catalog, link.getAttribute('href') ?? '');
      expect(task).not.toBeNull();
      expect(link.querySelector('h3')?.text).toBe(task?.label);
    }
    for (const link of hub.querySelectorAll('#models a.tile')) {
      expect(modelFamilies(catalog).some(model => model.href === link.getAttribute('href'))).toBe(true);
    }
    for (const link of hub.querySelectorAll('#styles a.tile')) {
      expect(catalog.styles.some(style => styleHref(catalog.locale, style.slug) === link.getAttribute('href'))).toBe(true);
    }
    const beauty = catalog.useCases.find(task => task.slug === 'beauty');
    expect(beauty?.href).toBe('/zh-CN/prompts?useCase=beauty');
    const deck = parse(renderToStaticMarkup(createElement(DeckBrowse, { catalog, prompts: catalog.prompts })));
    expect(deck.querySelectorAll('a').some(link => link.getAttribute('href') === beauty?.href)).toBe(true);
    expect(deck.querySelectorAll('a').some(link => link.getAttribute('href') === taskHref(catalog.locale, 'beauty'))).toBe(false);
  });

  it('keeps task pages nonindexable without approved entity SEO and preserves supplied SEO', () => {
    vi.stubEnv('FRONTEND_SITE_URL', 'https://example.com');
    const task = catalog.useCases.find(task => task.slug === 'beauty')!;
    const path = taskHref(catalog.locale, task.slug);
    const publicCatalog = { ...catalog, mode: 'public-api' as const };
    const metadata = siteMetadata(publicCatalog, path, `${task.label} prompts`, undefined, task);
    expect(metadata.title).toBe('Beauty prompts · Prompt Library');
    expect(metadata.robots).toMatchObject({ index: false });
    expect(siteMetadata(catalog, path, `${task.label} prompts`, undefined, task).robots).toEqual({ index: false, follow: false });
    const seo = {
      title: 'Approved task title', description: 'Approved task description',
      canonicalUrl: `https://example.com${path}`, hreflang: { 'zh-CN': `https://example.com${path}` },
      robots: 'noindex,nofollow' as const,
    };
    const approved = siteMetadata(publicCatalog, path, `${task.label} prompts`, undefined, { ...task, seo });
    expect(approved.title).toBe('Approved task title');
    expect(approved.description).toBe(seo.description);
    expect(approved.alternates).toEqual({ canonical: seo.canonicalUrl, languages: seo.hreflang });
    expect(approved.robots).toEqual({ index: false, follow: false });
  });
});
