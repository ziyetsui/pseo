import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { Recipe } from '@/components/Recipe';
import { websiteEntries } from '@/lib/catalog/website';

describe('ANNALS source-thread media', () => {
  for (const locale of ['en', 'zh-CN'] as const) it(`connects the parent demonstration without replacing the prompt source in ${locale}`, () => {
    const catalog = createGitBetaCatalog(locale);
    const prompt = catalog.prompts.find(row => row.id === 'prm_7d46d699adedf29269d0660aa4086291')!;
    expect(prompt.source.url).toBe('https://x.com/emollick/status/2074669101264294069');
    expect(prompt.kind).toBe('other');
    expect(prompt.media).toHaveLength(1);
    expect(prompt.media[0]).toMatchObject({ kind: 'video', width: 1280, height: 784 });
    expect(prompt.media[0]?.src).toBe('/website-videos/2074667244932444479.mp4');
    expect(prompt.img).toBe(prompt.media[0]?.poster);
    expect(prompt.evidence.some(row => row.url === 'https://x.com/emollick/status/2074667244932444479')).toBe(true);
    const html = parse(renderToStaticMarkup(<Recipe catalog={catalog} prompt={prompt} />));
    expect(html.querySelector('.nomedia')).toBeNull();
    expect(html.querySelector('.shots video')?.getAttribute('poster')).toBe(prompt.img);
    expect(html.querySelector('.shots video')?.hasAttribute('controls')).toBe(true);
    expect(websiteEntries(catalog).find(row => row.id === prompt.id)?.cover).toBe(prompt.img);
  });
});
