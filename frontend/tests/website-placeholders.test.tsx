import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { Recipe } from '@/components/Recipe';
import { placeholderTokens, filledPlaceholderParts } from '@/lib/catalog/placeholders';
import templates from '@/data/website-prompt-templates.json';
import translations from '@/data/zh-prompt-bodies.json';
import graph from '../../docs/intake/2026-10-14-website-supplement/combined-graph.json';
import { websiteTemplate, type WebsiteTemplate } from '@/lib/catalog/website-templates';
import { gitBetaRevision } from '@/lib/catalog/git-beta-revision';
import { createHash } from 'node:crypto';
import { websitePrompts } from '@/lib/catalog/website';

describe('editable website prompts', () => {
  it('provides usable, matching variables in both locales for every website prompt', () => {
    const en = createGitBetaCatalog('en');
    const zh = createGitBetaCatalog('zh-CN');
    const websites = websitePrompts(en);
    expect(websites.length).toBeGreaterThan(170);
    for (const prompt of websites) {
      const translated = zh.prompts.find(item => item.id === prompt.id)!;
      expect(prompt.variables.length, prompt.id).toBeGreaterThan(0);
      expect(prompt.editableTemplate, prompt.id).toBe(true);
      expect(placeholderTokens(translated.prompt).sort(), prompt.id).toEqual(placeholderTokens(prompt.prompt).sort());
      for (const variant of [prompt, translated]) {
        expect(variant.variables.map(variable => variable.token).sort()).toEqual(placeholderTokens(variant.prompt).sort());
      }
    }
    const tram = websites.find(prompt => prompt.slug === 'case-d29e2da62ee84fe089a7dfa0345199de')!;
    expect(tram.prompt).toContain('[UI]');
    expect(tram.variables.map(variable => variable.token)).not.toContain('[UI]');
  });

  it('can restore every byte outside the reviewed inputs in both languages', () => {
    const entries: Record<string, WebsiteTemplate> = templates;
    const translated: Record<string, { text: string }> = translations;
    for (const locale of ['en', 'zh-CN'] as const) {
      const catalog = createGitBetaCatalog(locale);
      for (const [id, template] of Object.entries(entries)) {
        const node = graph.nodes.find(node => node.id === id)!;
        if (!('prompt' in node) || typeof node.prompt !== 'string') throw new Error(id);
        const source = locale === 'en' ? node.prompt : translated[id]!.text;
        const spans = template.edits.flatMap(edit => {
          const original = locale === 'en' ? edit.en : edit.zh;
          const positions = [...source.matchAll(new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))];
          return positions.filter((_, index) => edit.occurrence === undefined || index === edit.occurrence).map(match => ({ start: match.index!, token: edit.token, original }));
        }).sort((a, b) => a.start - b.start);
        const originals = new Map<string, string[]>();
        for (const span of spans) originals.set(span.token, [...(originals.get(span.token) ?? []), span.original]);
        const display = catalog.prompts.find(prompt => prompt.id === id)!.prompt;
        const restored = display.replace(/\[[A-Z][A-Z0-9_]*\]/g, token => originals.get(token)?.shift() ?? token);
        expect(restored, `${locale} ${id}`).toBe(source);
        expect([...originals.values()].flat(), `${locale} ${id}`).toEqual([]);
      }
    }
  });

  it('rejects stale inputs and overlapping edits and binds template data to the export revision', () => {
    const base = createGitBetaCatalog('en').prompts[0]!;
    const prompt = { ...base, prompt: 'Brand and Brand', variables: [] };
    const digest = (text: string) => `sha256:${createHash('sha256').update(text).digest('hex')}`;
    const entry = { sourceHash: digest(prompt.prompt), translationHash: digest('品牌和品牌'), edits: [{ token: '[BRAND]', en: 'Brand', zh: '品牌' }] };
    expect(websiteTemplate(prompt, 'en', entry).prompt).toBe('[BRAND] and [BRAND]');
    expect(() => websiteTemplate({ ...prompt, prompt: 'changed' }, 'en', entry)).toThrow('Stale');
    expect(() => websiteTemplate(prompt, 'en', { ...entry, edits: [...entry.edits, {token: '[NAME]', en: 'Brand and', zh: '品牌和'}] })).toThrow('Overlapping');
    expect(gitBetaRevision('base', {}, {}, {}, {}, {}, entriesForRevision('first'))).not.toBe(gitBetaRevision('base', {}, {}, {}, {}, {}, entriesForRevision('second')));
  });

  it('makes the kingdom example editable without changing its implementation constraints', () => {
    const catalog = createGitBetaCatalog('en');
    const prompt = catalog.prompts.find(item => item.slug === 'case-7d46d699adedf29269d0660aa4086291')!;
    expect(prompt.prompt).toContain('[PROJECT_NAME]');
    expect(prompt.prompt).toContain('[PANEL_COLOR]');
    expect(prompt.prompt).toContain('vanilla JS + Three.js');
    expect(prompt.prompt).toContain('Performance floor: 60 fps');
    const values = { '[PROJECT_NAME]': 'MY KINGDOM', '[PANEL_COLOR]': '#FFFFFF' };
    const filled = filledPlaceholderParts(prompt.prompt, prompt.variables.map(variable => variable.token), values).map(part => part.text).join('');
    expect(filled).toContain('MY KINGDOM');
    expect(filled).toContain('#FFFFFF');
    expect(filled).not.toContain('[PROJECT_NAME]');
    const html = renderToStaticMarkup(<Recipe catalog={catalog} prompt={prompt} />);
    expect(html).not.toContain('This prompt has no placeholders');
    expect(html).not.toContain('Word for word, as published.');
  });
});

function entriesForRevision(value: string) { return { website: { token: value } }; }
