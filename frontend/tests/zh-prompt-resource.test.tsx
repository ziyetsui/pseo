import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import translations from '@/data/zh-prompt-bodies.json';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { placeholderTokens } from '@/lib/catalog/placeholders';
import { HubReader } from '@/components/HubReader';
import { RecipeText } from '@/components/RecipeText';

const en = createGitBetaCatalog('en'), zh = createGitBetaCatalog('zh-CN');
const chinese = /\p{Script=Han}/u;
const occurrences = (value: string, pattern: RegExp) => (value.match(pattern) ?? []).sort();
describe('complete Chinese prompt body resource', () => {
 it('covers precisely all 728 source records with exact UTF-8 hashes and Chinese body text', () => {
  expect(en.prompts).toHaveLength(728);
  expect(Object.keys(translations).sort()).toEqual(en.prompts.map(prompt => prompt.id).sort());
  const entries: Record<string, { sourceHash: string; text: string }> = translations;
  for (const source of en.prompts) {
   const entry = entries[source.id]!;
   const displayed = zh.prompts.find(prompt => prompt.id === source.id)!;
   expect(entry.sourceHash, source.id).toBe(`sha256:${createHash('sha256').update(source.prompt, 'utf8').digest('hex')}`);
   expect(displayed.prompt, source.id).toBe(entry.text);
   expect(chinese.test(displayed.prompt), source.id).toBe(true);
   expect(displayed.language, source.id).toBe('zh-CN');
   expect(displayed.originalPrompt ?? displayed.prompt, source.id).toBe(source.prompt);
   expect(displayed.originalLanguage ?? displayed.language, source.id).toBe(source.language);
   expect(placeholderTokens(displayed.prompt).sort(), source.id).toEqual(placeholderTokens(source.prompt).sort());
   expect(occurrences(displayed.prompt, /\d+/g), source.id).toEqual(occurrences(source.prompt, /\d+/g));
   expect(occurrences(displayed.prompt, /\{argument\s+[^{}]+\}/g), source.id).toEqual(occurrences(source.prompt, /\{argument\s+[^{}]+\}/g));
   if (!chinese.test(source.prompt)) expect(displayed.prompt, source.id).not.toBe(source.prompt);
  }
 });
 it('shows screenshot prompt 2071174186978951379 in Chinese in Hub preview and L4', () => {
  const prompt = zh.prompts.find(prompt => prompt.id === '2071174186978951379')!;
  const source = en.prompts.find(candidate => candidate.id === prompt.id)!;
  expect(prompt.originalPrompt).toBe(source.prompt);
  expect(prompt.prompt).not.toBe(source.prompt);
  const hub = parse(renderToStaticMarkup(<HubReader catalog={{ ...zh, prompts: [prompt] }} />));
  const preview = hub.querySelector('.txt')!;
  expect(preview.getAttribute('lang')).toBe('zh-CN');
  expect(preview.textContent.startsWith(prompt.prompt.replace(/\s+/g, ' ').trim().slice(0, 80))).toBe(true);
  expect(chinese.test(preview.textContent)).toBe(true);
  expect(preview.textContent).not.toBe(source.prompt);
  expect(hub.textContent).toContain('中文译文');
  const detail = parse(renderToStaticMarkup(<RecipeText prompt={prompt} uiLocale="zh-CN" showOriginalLanguage />));
  expect(detail.querySelector('[data-prompt]')?.getAttribute('lang')).toBe('zh-CN');
  expect(detail.querySelector('[data-prompt]')?.textContent).toBe(prompt.prompt);
  expect(detail.querySelector('#recipe-text')?.parentNode?.textContent).toContain('中文译文');
 });
});
