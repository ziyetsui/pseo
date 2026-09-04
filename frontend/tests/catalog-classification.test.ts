import { describe, expect, it } from 'vitest';
import { createFixtureCatalog } from '../src/lib/catalog/fixture';
import { filterPrompts } from '../src/lib/catalog/query';

const catalog = createFixtureCatalog('zh-CN');
const ids = (filters: Parameters<typeof filterPrompts>[1]) => filterPrompts(catalog, filters).map(p => p.id);

describe('reviewed visual catalog classification', () => {
  it('does not promote excluded styles or makeup descriptions into rendering styles', () => {
    expect(ids({ style: ['anime-illustrated'] })).not.toEqual(expect.arrayContaining(['2019849202591789460']));
    for (const id of ['2019849202591789460', '2065638647886659855', '2051559171452215583']) {
      expect(catalog.prompts.find(p => p.id === id)?.styles.map(s => s.label)).not.toContain('Anime / illustrated');
    }
    for (const id of ['2047862141894681076', '2068543924055240801']) expect(ids({ style: ['cinematic'] })).not.toContain(id);
  });
  it('classifies the requested task instead of incidental props or website references', () => {
    for (const id of ['2085640281941307648', '2018792341192990900', '2068543924055240801']) expect(ids({ useCase: ['food-beverage'] })).not.toContain(id);
    expect(ids({ useCase: ['food-beverage'] })).toContain('2071174186978951379');
    const poster = catalog.prompts.find(p => p.id === '1992826251220754540')!;
    expect(poster.useCases.map(r => r.label)).toContain('Product marketing');
    expect(poster.useCases.map(r => r.label)).not.toContain('Web & motion design');
  });
  it('keeps video poster records in videos and unconfirmed text out of both media types', () => {
    expect(ids({ contentType: ['video'] })).toHaveLength(11);
    expect(ids({ contentType: ['image'] })).toHaveLength(22);
    expect(ids({ contentType: ['image', 'video'] })).not.toContain('2019109812341207229');
    for (const p of filterPrompts(catalog, { contentType: ['video'] })) {
      expect(p.media.every(m => m.kind === 'image')).toBe(true);
      expect(p.href).toContain(p.slug);
    }
  });
});
