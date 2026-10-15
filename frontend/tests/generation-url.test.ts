import { describe, expect, it } from 'vitest';
import { generationHref } from '@/lib/cta/generation-url';
describe('Ancher prompt handoff', () => {
  it.each(['', '中文与かな 🌙\nSecond line\n', '{"prompt":"[NAME] & + # ? = % /"}', '长文本\n'.repeat(10000)])('round-trips the full prompt without truncation', prompt => {
    const url = new URL(generationHref(prompt));
    expect(url.origin).toBe('https://app.ancher.ai');
    expect(url.pathname).toBe('/');
    expect([...url.searchParams.keys()]).toEqual(['prompts']);
    expect(url.searchParams.get('prompts')).toBe(prompt);
    expect(url.hash).toBe('');
  });
});
