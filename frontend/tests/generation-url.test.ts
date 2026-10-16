import { describe, expect, it } from 'vitest';
import { generationHref, generationKind } from '@/lib/cta/generation-url';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { websitePrompts } from '@/lib/catalog/website';
describe('Ancher prompt handoff', () => {
  it('treats every catalog website as HTML, even with image or video previews', () => {
    const catalog = createGitBetaCatalog('en');
    const websites = websitePrompts(catalog);
    expect(websites.length).toBeGreaterThan(0);
    for (const prompt of websites) {
      expect(generationKind(prompt)).toBe('website');
      expect(generationKind({ ...prompt, kind: 'image' })).toBe('website');
      expect(generationKind({ ...prompt, kind: 'video' })).toBe('website');
    }
    const image = catalog.prompts.find(prompt => prompt.kind === 'image' && !websites.includes(prompt))!;
    expect(generationKind(image)).toBe('image');
  });
  it.each([
    ['image', '创建一张关于的图片'],
    ['website', '创建一个关于的 HTML 网页'],
  ] as const)('adds the %s instruction before the complete, untouched prompt', (kind, instruction) => {
    const prompt = '  [NAME] 中文 🌙 & + # ? = %\n{"layout":[1,2]}\n';
    expect(new URL(generationHref(prompt, kind)).searchParams.get('prompts')).toBe(`${instruction}\n\n${prompt}`);
    expect(new URL(generationHref('', kind)).searchParams.get('prompts')).toBe(instruction);
  });
  it('keeps video prompts unchanged', () => {
    expect(new URL(generationHref('Pan left.\n', 'video')).searchParams.get('prompts')).toBe('Pan left.\n');
  });
  it.each(['', '中文与かな 🌙\nSecond line\n', '{"prompt":"[NAME] & + # ? = % /"}', '长文本\n'.repeat(10000)])('round-trips the full prompt without truncation', prompt => {
    const url = new URL(generationHref(prompt));
    expect(url.origin).toBe('https://app.ancher.ai');
    expect(url.pathname).toBe('/');
    expect([...url.searchParams.keys()]).toEqual(['prompts']);
    expect(url.searchParams.get('prompts')).toBe(prompt);
    expect(url.hash).toBe('');
  });
});
