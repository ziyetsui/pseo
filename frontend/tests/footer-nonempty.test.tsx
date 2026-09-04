import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from '@/components/Chrome';
import { createFixtureCatalog } from '@/lib/catalog/fixture';
import type { Catalog, Creator, Prompt, Ref } from '@/lib/catalog/types';

const fixture = createFixtureCatalog('zh-CN');
const ref = (slug: string, label = slug, count = 999): Ref => ({ id: `id:${slug}`, slug, label, count, href: `/zh-CN/prompts/models/${slug}` });
const prompt = (overrides: Partial<Prompt> = {}): Prompt => ({
  ...fixture.prompts[0]!, models: [], useCases: [], styles: [], subjects: [], handle: '', creatorRef: null,
  kind: 'text', img: null, media: [], ...overrides,
});
const catalog = (overrides: Partial<Catalog> = {}): Catalog => ({
  ...fixture, mode: 'public-api', models: [], useCases: [], styles: [], subjects: [], creators: [], prompts: [], ...overrides,
});
const footer = (source: Catalog) => parse(renderToStaticMarkup(<SiteFooter catalog={source} />));
const links = (source: Catalog) => footer(source).querySelectorAll('a').map(link => [link.text, link.getAttribute('href')]);

describe('footer populated destinations', () => {
  it('ignores stale counts, retains text-only relationships, and matches IDs or slugs without prefix guesses', () => {
    const beauty = ref('beauty', 'Beauty', 0), emptyTask = ref('fashion', 'Fashion');
    const cinematic = ref('cinematic', 'Cinematic', 0), emptyStyle = ref('luxury', 'Luxury');
    const portrait = ref('portrait', 'Person / portrait', 0), emptySubject = ref('vehicle', 'Vehicle');
    const source = catalog({
      useCases: [emptyTask, beauty], styles: [cinematic, emptyStyle], subjects: [emptySubject, portrait],
      prompts: [prompt({ useCases: [{ ...beauty, slug: 'changed' }, ref('fashion-other')], styles: [{ ...cinematic, id: 'changed' }], subjects: [portrait] })],
    });
    expect(links(source)).toEqual([
      ['Beauty prompts', '/zh-CN/prompts/use-cases/beauty'],
      ['Cinematic prompts', '/zh-CN/prompts/styles/cinematic'],
      ['Person / portrait prompts', '/zh-CN/prompts/subjects/portrait'],
      ['All prompts', '/zh-CN/prompts'],
    ]);
    expect(footer(source).querySelector('img')).toBeNull();
  });

  it('groups model families once, includes populated zero-count versions, and drops empty models', () => {
    const base = ref('nano-banana', 'Nano Banana', 0), pro = ref('nano-banana-pro', 'Nano Banana Pro', 0);
    const one = prompt({ models: [base, pro] });
    const source = catalog({ models: [ref('sora', 'Sora'), pro, base], prompts: [one, one] });
    expect(links(source)).toEqual([
      ['Nano Banana prompts', '/zh-CN/prompts/model-families/nano-banana'],
      ['All prompts', '/zh-CN/prompts'], ['All models', '/zh-CN/prompts/models'],
    ]);
  });

  it.each(['text', 'other'] as const)('does not invent image or video destinations for %s prompts', kind => {
    expect(links(catalog({ prompts: [prompt({ kind, img: '/poster.jpg', media: [{ id: 'poster', kind: 'image', src: '/poster.jpg', alt: '', width: null, height: null, poster: null, label: null }] })] })))
      .toEqual([['All prompts', '/zh-CN/prompts']]);
  });

  it('includes media destinations based on prompt kind even without a preview', () => {
    expect(links(catalog({ prompts: [prompt({ kind: 'video' })] }))).toEqual([
      ['Video prompts', '/zh-CN/prompts/video'], ['All prompts', '/zh-CN/prompts'],
    ]);
    expect(links(catalog({ prompts: [prompt({ kind: 'image' }), prompt({ kind: 'video' })] }))).toEqual([
      ['Image prompts', '/zh-CN/prompts/image'], ['Video prompts', '/zh-CN/prompts/video'], ['All prompts', '/zh-CN/prompts'],
    ]);
  });

  it('requires a registered creator with a real prompt association', () => {
    const creator: Creator = { ...ref('author'), handle: '@Author', url: 'https://x.com/Author', avatarUrl: null };
    for (const row of [
      prompt({ creatorRef: { id: creator.id, slug: 'changed', label: 'Author' } }),
      prompt({ creatorRef: { id: 'changed', slug: creator.slug, label: 'Author' } }),
      prompt({ handle: '@author' }),
    ]) expect(links(catalog({ creators: [creator], prompts: [row] }))).toContainEqual(['All creators', '/zh-CN/prompts/creators']);
    expect(links(catalog({ creators: [creator], prompts: [prompt()] }))).not.toContainEqual(['All creators', '/zh-CN/prompts/creators']);
    expect(links(catalog({ creators: [{ ...creator, handle: '' }], prompts: [prompt()] }))).toEqual([['All prompts', '/zh-CN/prompts']]);
    expect(links(catalog({ prompts: [prompt({ handle: creator.handle })] }))).toEqual([['All prompts', '/zh-CN/prompts']]);
  });

  it('hides every empty column without mutating the registry', () => {
    const source = catalog({ models: [ref('sora')], useCases: [ref('beauty')], styles: [ref('cinematic')], subjects: [ref('portrait')], creators: fixture.creators });
    const before = JSON.stringify(source);
    expect(footer(source).querySelectorAll('.footnav h3')).toHaveLength(0);
    expect(links(source)).toEqual([]);
    expect(JSON.stringify(source)).toBe(before);
    expect(footer(source).querySelector('.footlegal')).not.toBeNull();
  });

  it('preserves the fixture label and ordering conventions while filtering empty links', () => {
    const beauty = ref('beauty', 'Beauty'), fashion = ref('fashion', 'Fashion'), web = ref('web-motion', 'Web & motion design');
    const source = catalog({ mode: 'visual-fixture', useCases: [web, beauty, fashion, ref('automotive', 'Automotive')], prompts: [prompt({ useCases: [beauty, web, fashion] })] });
    expect(links(source).slice(0, 3)).toEqual([
      ['Fashion prompts', '/zh-CN/prompts/use-cases/fashion'], ['Beauty prompts', '/zh-CN/prompts/use-cases/beauty'], ['Web & motion prompts', '/zh-CN/prompts/use-cases/web-motion'],
    ]);
  });
});
