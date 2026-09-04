import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import { HubBrowse } from '../src/components/Browse';
import { TaskFindings } from '../src/components/TaskFindings';
import { SiteHeader } from '../src/components/Chrome';
import { createFixtureCatalog } from '../src/lib/catalog/fixture';

const catalog = createFixtureCatalog('zh-CN');
const hub = `/${catalog.locale}/prompts`;

describe('Task page primary navigation', () => {
  it('does not mark Images current on directory or blog headers', () => {
    const header = parse(renderToStaticMarkup(createElement(SiteHeader, { level: 'deck', locale: catalog.locale })));
    expect(header.querySelector('[aria-current="page"]')?.getAttribute('href')).toBeUndefined();
    for (const kind of ['image', 'video'] as const) {
      const deck = parse(renderToStaticMarkup(createElement(SiteHeader, { level: 'deck', locale: catalog.locale, contentType: kind })));
      expect(deck.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe(`${hub}/${kind}`);
    }
  });

  it('links every Task header item to an existing library section, including empty tasks', () => {
    const destination = parse(renderToStaticMarkup(createElement(HubBrowse, { catalog })));
    for (const task of catalog.useCases) {
      const page = parse(renderToStaticMarkup(createElement(TaskFindings, { catalog, task })));
      const links = page.querySelectorAll('.navlinks a');
      expect(links).toHaveLength(4);
      for (const link of links) {
        const href = link.getAttribute('href') ?? '';
        expect(href, `${task.slug}: ${link.text}`).toBe(`${hub}#${link.text.toLowerCase()}`);
        const anchor = href.split('#')[1] ?? '';
        expect(destination.getElementById(anchor), href).not.toBeNull();
      }
      expect(page.getElementById('main')).not.toBeNull();
      expect(page.querySelector('.skip')?.getAttribute('href')).toBe('#main');
    }
  });
});
