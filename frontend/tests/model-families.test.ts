import { describe, expect, it } from 'vitest';
import { createFixtureCatalog } from '../src/lib/catalog/fixture';
import { modelFamilies, modelFamilyForPath, promptsForFamily } from '../src/lib/catalog/model-families';
import type { Catalog, Prompt, Ref } from '../src/lib/catalog/types';

const catalog = createFixtureCatalog('zh-CN');
const model = (slug: string): Ref => ({ id: `registered:${slug}`, slug, label: slug, href: `/zh-CN/prompts/models/${slug}`, count: 999 });
const prompt = (id: string, models: Ref[]): Prompt => ({ ...catalog.prompts[0]!, id, models });

describe('model family navigation', () => {
  it('unions versions by immutable prompt identity and retains the supplied prompt order', () => {
    const base = model('nano-banana');
    const pro = model('nano-banana-pro');
    const second = model('nano-banana-2');
    const other = model('seedance');
    const shared = prompt('shared', [base, pro, second]);
    const rows = [shared, prompt('pro-only', [pro]), shared, prompt('other', [other])];
    const source: Catalog = { ...catalog, models: [pro, other, base, second], prompts: rows };
    const families = modelFamilies(source);
    expect(families.map(family => family.slug)).toEqual(['nano-banana', 'seedance']);
    const nano = families[0]!;
    expect(nano.label).toBe('Nano Banana');
    expect(nano.id).toBe('model-family:nano-banana');
    expect(nano.count).toBe(2);
    expect(nano.href).toBe('/zh-CN/prompts/model-families/nano-banana');
    expect(promptsForFamily(rows, nano).map(row => row.id)).toEqual(['shared', 'pro-only']);
    expect(modelFamilies(source, [rows[1]!])[0]!.count).toBe(1);
    expect(families[1]).toMatchObject({ id: other.id, href: other.href, count: 1 });
    expect(base.count).toBe(999);
  });

  it('only groups registered exact members and preserves unfamiliar models independently', () => {
    const base = model('gpt-image');
    const second = model('gpt-image-2');
    const unknown = model('gpt-image-20');
    const source = { ...catalog, models: [base, second, unknown], prompts: [
      prompt('exact-id', [{ ...second, slug: 'different-label-slug' }]),
      prompt('exact-slug', [{ ...base, id: 'different-id' }]),
      prompt('prefix-only', [unknown]),
      prompt('unregistered-nano', [model('nano-banana-pro')]),
    ] };
    const families = modelFamilies(source);
    expect(families.map(family => [family.slug, family.count])).toEqual([['gpt-image', 2], ['gpt-image-20', 1]]);
    expect(families[0]!.memberSlugs).toEqual(['gpt-image', 'gpt-image-2']);
    expect(families[0]!.memberIds).toEqual([base.id, second.id]);
    expect(modelFamilies({ ...source, models: [base] })[0]).toMatchObject({ id: base.id, href: base.href, count: 1 });
    expect(modelFamilies({ ...source, models: [] })).toEqual([]);
  });

  it('retains registered empty destinations without inheriting version-specific SEO for a family', () => {
    const base = { ...model('nano-banana'), description: 'This version only.', seo: {
      title: 'Version title', description: 'Version description', canonicalUrl: 'https://example.com/version',
      hreflang: { en: 'https://example.com/version' }, robots: 'index,follow' as const,
    } };
    const other = { ...model('veo'), description: 'Veo description' };
    const families = modelFamilies({ ...catalog, models: [base, model('nano-banana-pro'), other], prompts: [] });
    expect(families.map(family => family.count)).toEqual([0, 0]);
    expect(families[0]!.seo).toBeUndefined();
    expect(families[0]!.description).toBeUndefined();
    expect(families[1]!.description).toBe(other.description);
  });

  it('resolves only exported family paths in the exact locale, leaving model versions separate', () => {
    for (const family of modelFamilies(catalog).filter(family => family.memberSlugs.length > 1)) {
      expect(modelFamilyForPath(catalog, family.href)).toEqual(family);
      expect(modelFamilyForPath(catalog, `${family.href}?model=veo`)).toBeNull();
      expect(modelFamilyForPath(catalog, `${family.href}#index`)).toBeNull();
      expect(modelFamilyForPath(catalog, family.href.replace('/zh-CN/', '/en/'))).toBeNull();
    }
    for (const registered of catalog.models) expect(modelFamilyForPath(catalog, registered.href)).toBeNull();
    expect(modelFamilyForPath(catalog, '/zh-CN/prompts/model-families/missing')).toBeNull();
    const english: Catalog = { ...catalog, locale: 'en' };
    expect(modelFamilyForPath(english, '/en/prompts/model-families/gpt-image')?.label).toBe('GPT Image');
  });
});
