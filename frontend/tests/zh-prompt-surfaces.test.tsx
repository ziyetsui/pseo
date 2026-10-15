// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const parse = (html: string) => { const root = document.createElement('div'); root.innerHTML = html; return root; };
import { createHash } from 'node:crypto';
import { createFixtureCatalog } from '@/lib/catalog/fixture';
import { localizedGitCatalog } from '@/lib/catalog/localized';
import { HubReader } from '@/components/HubReader';
import { DeckReader } from '@/components/DeckReader';
import { AnthologyReader } from '@/components/AnthologyReader';
import { StylePlateReader } from '@/components/StylePlateReader';
import { TaskFindingsReader } from '@/components/TaskFindingsReader';
import { RecipeText } from '@/components/RecipeText';
import { WebsiteCaseResults } from '@/components/WebsiteCaseResults';
import { websiteEntries } from '@/lib/catalog/website';

const fixture = createFixtureCatalog('zh-CN');
const sourcePrompt = { ...fixture.prompts[0]!, kind: 'image' as const };
const translated = '中文滚动故事：[PROJECT_BRIEF]、[MOTION_ASSETS]、[FINISHING_EFFECTS]。';
const catalog = localizedGitCatalog({ ...fixture, mode: 'git-beta', prompts: [sourcePrompt] }, 'zh-CN', {
 [sourcePrompt.id]: { sourceHash: `sha256:${createHash('sha256').update(sourcePrompt.prompt).digest('hex')}`, text: translated },
});
const prompt = catalog.prompts[0]!;
const body = (element: React.ReactNode, selector: string) => parse(renderToStaticMarkup(element)).querySelector(selector);

describe('translated body consumers', () => {
 it('renders the projected Chinese text in Hub, lists, and detail without exposing source prose as display text', () => {
  const elements = [
   [<HubReader catalog={catalog} />, '.txt'],
   [<DeckReader catalog={catalog} contentType="image" />, 'pre.prompt'],
   [<AnthologyReader catalog={catalog} model={catalog.models[0]!} />, '.body .mono'],
   [<StylePlateReader catalog={catalog} style={catalog.styles[0]!} />, '.wall'],
   [<TaskFindingsReader catalog={catalog} task={catalog.useCases[0]!} tasks={catalog.useCases} />, '.verbatim'],
   [<RecipeText prompt={prompt} uiLocale="zh-CN" showOriginalLanguage />, '[data-prompt]'],
  ] as const;
  for (const [element, selector] of elements) {
   const content = body(element, selector)!;
   expect(content.textContent).toBe(translated);
   expect(content.getAttribute('lang')).toBe('zh-CN');
  }
 });
 it('renders Website body and translation labels in each presentation', () => {
  const rows = websiteEntries(catalog).filter(row => row.id === prompt.id);
  for (const presentation of ['deck', 'findings', 'anthology'] as const) {
   const doc = parse(renderToStaticMarkup(<WebsiteCaseResults rows={rows} presentation={presentation} promptTexts={{ [prompt.id]: prompt.prompt }} promptLanguages={{ [prompt.id]: prompt.language }} promptTranslations={{ [prompt.id]: true }} topics={{}} uiLocale="zh-CN" />));
   expect(doc.querySelector('pre.prompt, .verbatim, .body .mono')?.textContent).toBe(translated);
   expect(doc.textContent).toContain('中文译文');
  }
 });
});
