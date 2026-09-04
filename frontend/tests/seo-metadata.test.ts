import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFixtureCatalog } from '@/lib/catalog/fixture';
import { siteMetadata } from '@/site/metadata';
import { modelFamilyForPath } from '@/lib/catalog/model-families';

const fixture = createFixtureCatalog('zh-CN');
afterEach(() => vi.unstubAllEnvs());

describe('SEO projection regression coverage', () => {
  it('preserves approved Prompt canonical, title and hreflang rather than rebuilding variants', () => {
    vi.stubEnv('FRONTEND_SITE_URL', 'https://example.com');
    const prompt = { ...fixture.prompts[0]!, seo: { title: 'Approved title', description: 'Approved description', robots: 'index,follow', canonicalUrl: 'https://example.com/zh-CN/prompts/approved', hreflang: { en: 'https://example.com/en/prompts/reviewed-translation', 'zh-CN': 'https://example.com/zh-CN/prompts/approved', 'x-default': 'https://example.com/en/prompts/reviewed-translation' } } };
    const result = siteMetadata({ ...fixture, mode: 'public-api' }, prompt.href, 'UI title', prompt);
    expect(result.title).toBe(prompt.seo.title);
    expect(result.description).toBe(prompt.seo.description);
    expect(result.alternates).toEqual({ canonical: prompt.seo.canonicalUrl, languages: prompt.seo.hreflang });
    expect(result.robots).toEqual({ index: true, follow: true });
    vi.stubEnv('FRONTEND_SITE_URL', 'https://another.example');
    expect(() => siteMetadata({ ...fixture, mode: 'public-api' }, prompt.href, prompt.title, prompt)).toThrow('Canonical origin');
  });

  it('keeps fixtures isolated even if an indexable surface was supplied', () => {
    const result = siteMetadata(fixture, '/zh-CN/prompts', 'UI title', undefined, undefined, { canonicalUrl: 'https://example.com/zh-CN/prompts', robots: 'index,follow', hreflang: { en: 'https://example.com/en/prompts' } });
    expect(result.robots).toEqual({ index: false, follow: false });
    expect(result.alternates).toEqual({ canonical: undefined, languages: undefined });
  });

  it('distinguishes family metadata from its concrete model without changing their visible labels', () => {
    const familyPath = '/zh-CN/prompts/model-families/nano-banana';
    const family = modelFamilyForPath(fixture, familyPath)!;
    const version = fixture.models.find(model => model.slug === 'nano-banana')!;
    const grouped = siteMetadata(fixture, familyPath, `${family.label} prompts`, undefined, family);
    const concrete = siteMetadata(fixture, version.href, `${version.label} prompts`, undefined, version);
    expect(grouped.title).not.toBe(concrete.title);
    expect(grouped.description).toContain('Nano Banana Pro');
    expect(grouped.description).toContain('Nano Banana 2');
    expect(grouped.description).not.toBe(concrete.description);
    expect(family.label).toBe('Nano Banana');
  });

  it('only indexes list pages when the verified surface supplies qualification', () => {
    vi.stubEnv('FRONTEND_SITE_URL', 'https://example.com');
    const catalog = { ...fixture, mode: 'public-api' as const };
    for (const path of ['/zh-CN/prompts', '/zh-CN/blog']) {
      expect(siteMetadata(catalog, path, 'UI title').robots).toMatchObject({ index: false });
      const surface = { canonicalUrl: `https://example.com${path}`, robots: 'index,follow' as const, hreflang: {} };
      const result = siteMetadata(catalog, path, 'UI title', undefined, undefined, surface);
      expect(result.robots).toEqual({ index: true, follow: true });
      expect(result.alternates?.canonical).toBe(surface.canonicalUrl);
    }
    expect(siteMetadata(catalog, '/zh-CN/blog', 'UI title').title).toBe('The notebook · Prompt Library');
    const alias = siteMetadata(catalog, '/zh-CN', 'UI title');
    expect(alias.robots).toMatchObject({ index: false });
    expect(alias.alternates?.canonical).toBe('https://example.com/zh-CN/prompts');
  });
});
