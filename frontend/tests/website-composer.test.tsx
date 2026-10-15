import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { websiteViews, websiteViewEntries } from '@/lib/catalog/website-views';
import { WebsiteViewGallery } from '@/components/WebsiteCases';

describe('Website L3 composer', () => {
  for (const locale of ['en', 'zh-CN'] as const) it(`matches model composers across Website anthology views in ${locale}`, () => {
    const catalog = createGitBetaCatalog(locale);
    for (const view of websiteViews(catalog).filter(view => view.axis === 'model' || view.axis === 'tool')) {
      const doc = parse(renderToStaticMarkup(<WebsiteViewGallery catalog={catalog} view={view} />));
      expect(doc.querySelector('.model-signature h1')?.textContent).toBe(view.label);
      expect(doc.querySelector('.model-signature textarea')?.getAttribute('placeholder')).toBe(locale === 'en' ? 'Describe the website you want to build…' : '描述你想创建的网站…');
      expect(doc.querySelector('.model-signature .website-filters')).toBeNull();
      expect(doc.querySelectorAll('.website-filters')).toHaveLength(1);
      expect(doc.querySelector('.msh-generate')?.getAttribute('href')).toBe('https://bo.ancher.ai/home');
      const entries = websiteViewEntries(catalog, view);
      expect(doc.querySelectorAll('[data-website-case]')).toHaveLength(entries.length);
      for (const entry of entries) {
        const article = doc.querySelector(`[data-website-case="${entry.id}"]`)!;
        const action = article.querySelector('.acts a');
        const prompt = catalog.prompts.find(prompt => prompt.id === entry.id || prompt.href === entry.promptHref);
        if (prompt?.prompt) expect(action?.getAttribute('href')).toBe(entry.promptHref ?? entry.href);
        else expect(action?.textContent).toBe(locale === 'en' ? 'Explore this project' : '探索此项目');
      }
    }
  });
});
