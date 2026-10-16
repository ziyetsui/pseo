import { describe, expect, it } from 'vitest';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { websiteRef } from '@/lib/catalog/website';
import { catalogPaths } from '@/site/routes';
import { dataMode } from '@/lib/catalog/config';

const catalog = () => createGitBetaCatalog('zh-CN');
describe('authorized Git beta publication', () => {
  it('loads 521 distinct new image prompts and retains all 541 source images', () => {
    const c = catalog();
    expect(c.mode).toBe('git-beta');
    expect(c.prompts.filter(p => p.kind === 'image' && !p.reconstruction)).toHaveLength(543);
    const imported = c.prompts.filter(p => p.kind === 'image' && p.id.startsWith('prm_'));
    expect(imported).toHaveLength(521);
    expect(new Set(imported.flatMap(p => p.media.map(m => m.src))).size).toBe(541);
    expect(imported.every(p => p.prompt.length > 0 && p.source.url && p.seo.robots === 'noindex,nofollow')).toBe(true);
  });
  it('gives every website project a separate case page without inventing missing prompts', () => {
    const c = catalog();
    expect(c.websites).toHaveLength(59);
    expect(c.websites?.filter(w => w.promptHref)).toHaveLength(12);
    expect(c.websites?.filter(w => !w.promptHref)).toHaveLength(47);
    expect(c.websites?.every(w => w.cover && w.source.url && catalogPaths(c).includes(w.href))).toBe(true);
    expect(websiteRef(c).count).toBe(224);
    expect(new Set(c.websites?.map(w => w.id)).size).toBe(59);
  });
  it('preserves all 13 image categories and keeps attribution evidence distinct from X handles', () => {
    const c = catalog();
    const imported = c.prompts.filter(p => p.kind === 'image' && p.id.startsWith('prm_'));
    expect(new Set(imported.flatMap(p => p.useCases.map(r => r.slug))).size).toBe(13);
    expect(c.creators.every(creator => !creator.url || /^https:\/\/x.com\/[A-Za-z0-9_]+$/.test(creator.url))).toBe(true);
    expect(imported.some(p => p.handle.includes('小红书'))).toBe(true);
    expect(imported.every(p => p.media.every(m => m.src.includes('5cb9109ca2d29476f8e34dbc0cdb43607bdd3f77')))).toBe(true);
  });
  it('uses a deterministic Git revision and never enables an unprovided locale or implicit fallback', () => {
    expect(catalog().revision).toBe(catalog().revision);
    expect(catalog().revision).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(createGitBetaCatalog('en').prompts.map(prompt=>prompt.id)).toEqual(catalog().prompts.map(prompt=>prompt.id));
    expect(dataMode({ FRONTEND_DATA_MODE: 'git-beta' })).toBe('git-beta');
    expect(() => dataMode({})).toThrow();
  });
});

it('binds the Git beta revision to every graph and preview change', async () => {
  const { gitBetaRevision } = await import('@/lib/catalog/git-beta-revision');
  expect(gitBetaRevision('base', { nodes: [1] }, { cover: 'a' })).not.toBe(gitBetaRevision('base', { nodes: [2] }, { cover: 'a' }));
  expect(gitBetaRevision('base', { nodes: [1] }, { cover: 'a' })).not.toBe(gitBetaRevision('base', { nodes: [1] }, { cover: 'b' }));
});

it('binds the revision to display translations',async()=>{const {gitBetaRevision}=await import('@/lib/catalog/git-beta-revision');expect(gitBetaRevision('base',{}, {}, {title:'first'})).not.toBe(gitBetaRevision('base',{}, {}, {title:'second'}));});
