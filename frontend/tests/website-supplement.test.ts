import { expect, it } from 'vitest';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { websiteEntries } from '@/lib/catalog/website';

it('serves the recovered coffee-cup prompt with its actual source without inventing a preview', () => {
  const c = createGitBetaCatalog('zh-CN');
  const p = c.prompts.find(p => p.source.url === 'https://x.com/aichrislee/status/2104240995613266119');
  expect(p).toBeDefined();
  expect(p?.prompt).toContain('Its eyes and head follow my mouse everywhere on the page.');
  expect(p?.prompt).toContain('One HTML file.');
  expect(p?.handle).toBe('@aichrislee');
  expect(p?.useCases.some(u => u.slug === 'website')).toBe(true);
  expect(p?.seo.robots).toBe('noindex,nofollow');
  const entry = websiteEntries(c).find(e => e.id === p?.id);
  expect(entry?.promptHref).toBe(p?.href);
  expect(entry?.cover).toBe('');
});

it('retains an author continuation in the complete chart-platform prompt', () => {
  const c = createGitBetaCatalog('zh-CN');
  const p = c.prompts.find(p => p.source.url === 'https://x.com/bryanlytics/status/2105413835637350486');
  expect(p?.prompt).toContain('5. Indicator plugin documentation.');
  expect(p?.prompt).toContain('6. Drawing-tool architecture documentation.');
  expect(p?.prompt).toContain('Implement the software.');
});

it('excludes a contract-blocked source from every published website surface', () => {
  const c = createGitBetaCatalog('zh-CN');
  expect(c.prompts.some(p => p.source.url.includes('/status/2100568253932491106'))).toBe(false);
  expect(websiteEntries(c).some(p => p.source.url.includes('/status/2100568253932491106'))).toBe(false);
  const recovered = c.websites?.filter(w => w.promptHref) ?? [];
  for (const entry of recovered) {
    expect(websiteEntries(c).filter(e => e.promptHref === entry.promptHref)).toHaveLength(1);
  }
});
