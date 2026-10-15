import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { localizedGitCatalog } from '@/lib/catalog/localized';
import { createFixtureCatalog } from '@/lib/catalog/fixture';
import { originalLanguage } from '@/lib/i18n/text';
import { filterPrompts } from '@/lib/catalog/query';
import { gitBetaRevision } from '@/lib/catalog/git-beta-revision';
const source = createFixtureCatalog('zh-CN');
const prompt = { ...source.prompts[0]!, prompt: 'Create a portrait', language: 'en' };
const catalog = { ...source, prompts: [prompt] };
const hash = (text: string) => `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
const translated = '中文提示词';
const entries = { [prompt.id]: { sourceHash: hash(prompt.prompt), text: translated } };
describe('Chinese prompt body projection', () => {
 it('uses Chinese display text with exact source retained and English unchanged', () => {
  const zh = localizedGitCatalog(catalog, 'zh-CN', entries).prompts[0]!;
  expect(zh.prompt).toBe(translated); expect(zh.language).toBe('zh-CN');
  expect(zh.originalPrompt).toBe(prompt.prompt); expect(zh.originalLanguage).toBe(prompt.language);
  expect(localizedGitCatalog(catalog, 'en', entries).prompts[0]!.prompt).toBe(prompt.prompt);
  expect(originalLanguage('zh-CN', zh.language, zh.originalPrompt !== undefined)).toBe('中文译文');
 });
 it('marks already Chinese display as Chinese while retaining a differing source language without claiming translation', () => {
  const input = { ...prompt, prompt: '{"description":"中文场景"}', language: 'en' };
  const projected = localizedGitCatalog({ ...catalog, prompts: [input] }, 'zh-CN', { [input.id]: { sourceHash: hash(input.prompt), text: input.prompt } }).prompts[0]!;
  expect(projected.language).toBe('zh-CN');
  expect(projected.originalLanguage).toBe('en');
  expect(projected.originalPrompt).toBeUndefined();
  expect(originalLanguage('zh-CN', projected.language, projected.originalPrompt !== undefined)).toBe('原文语言：中文');
  expect(projected.originalPrompt ?? projected.prompt).toBe(input.prompt);
 });
 it('searches translated body phrases identically after switching locale', () => {
  const en = localizedGitCatalog(catalog, 'en', entries), zh = localizedGitCatalog(catalog, 'zh-CN', entries);
  expect(filterPrompts(zh, { q: '中文提示词' }).map(p => p.id)).toEqual([prompt.id]);
  expect(filterPrompts(en, { q: '中文提示词' }).map(p => p.id)).toEqual([prompt.id]);
  expect(filterPrompts(zh, { q: 'Create a portrait' }).map(p => p.id)).toEqual([prompt.id]);
 });
 it('rejects missing, empty and stale translations instead of falling back to source', () => {
  expect(() => localizedGitCatalog(catalog, 'zh-CN', {})).toThrow(/translation/i);
  expect(() => localizedGitCatalog(catalog, 'zh-CN', { [prompt.id]: { ...entries[prompt.id]!, text: '' } })).toThrow(/translation/i);
  expect(() => localizedGitCatalog(catalog, 'zh-CN', { [prompt.id]: { ...entries[prompt.id]!, sourceHash: hash('stale') } })).toThrow(/translation/i);
 });
 it('rejects changed placeholder tokens and invalid translated JSON', () => {
  const input = { ...prompt, prompt: '{"subject":"[SUBJECT]"}', variables: [] };
  const source = { ...catalog, prompts: [input] };
  for (const text of ['{"subject":"[THING]"}', '{"subject":"[SUBJECT]”}']) {
   expect(() => localizedGitCatalog(source, 'zh-CN', { [input.id]: { sourceHash: hash(input.prompt), text } })).toThrow(/translation/i);
  }
  expect(localizedGitCatalog(source, 'zh-CN', { [input.id]: { sourceHash: hash(input.prompt), text: '{"subject":"中文[SUBJECT]"}' } }).prompts[0]!.prompt).toBe('{"subject":"中文[SUBJECT]"}');
 });
 it('rejects changed JSON keys, scalar values, arrays and leaf types', () => {
  const input = { ...prompt, prompt: '{"instruction":"Draw", "settings":{"count":2,"active":true,"seed":null},"frames":["First","Second"]}' };
  const source = { ...catalog, prompts: [input] };
  for (const text of [
   '{"指令":"画", "settings":{"count":2,"active":true,"seed":null},"frames":["一","二"]}',
   '{"instruction":"画", "settings":{"count":3,"active":true,"seed":null},"frames":["一","二"]}',
   '{"instruction":"画", "settings":{"count":2,"active":false,"seed":null},"frames":["一","二"]}',
   '{"instruction":"画", "settings":{"count":"2","active":true,"seed":null},"frames":["一","二"]}',
   '{"instruction":"画", "settings":{"count":2,"active":true,"seed":null},"frames":["一"]}',
  ]) expect(() => localizedGitCatalog(source, 'zh-CN', { [input.id]: { sourceHash: hash(input.prompt), text } })).toThrow(/translation/i);
  const text = '{"frames":["一","二"],"settings":{"active":true,"seed":null,"count":2},"instruction":"画"}';
  expect(localizedGitCatalog(source, 'zh-CN', { [input.id]: { sourceHash: hash(input.prompt), text } }).prompts[0]!.prompt).toBe(text);
 });
 it('binds the publication revision to prompt body translations', () => {
  expect(gitBetaRevision('base', {}, {}, {}, {}, entries)).not.toBe(gitBetaRevision('base', {}, {}, {}, {}, {}));
 });
});
