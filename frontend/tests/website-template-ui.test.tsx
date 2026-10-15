// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecipeText } from '@/components/RecipeText';
import { RecipeGenerateLink } from '@/components/RecipeGenerateLink';
import { WebsiteCaseResults } from '@/components/WebsiteCaseResults';
import { WebsiteCaseDetail, WebsiteGallery, WebsiteViewGallery } from '@/components/WebsiteCases';
import { Recipe } from '@/components/Recipe';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { websiteEntries } from '@/lib/catalog/website';
import { websiteViews } from '@/lib/catalog/website-views';
import { websiteEditableTemplate } from '@/lib/catalog/website-templates';

const template = {
  prompt: 'Build [PROJECT] with [PROJECT].', language: 'en', editableTemplate: true,
  originalPrompt: 'An immutable original', origin: 'adapted-source' as const,
  variables: [{ token: '[PROJECT]', label: 'Project', defaultValue: 'a portfolio', options: ['a shop'], note: null, required: true }],
};
afterEach(cleanup);

describe('Website editable template UI', () => {
  it('server-renders a complete editable template and honest origin labels', () => {
    const html = renderToStaticMarkup(<RecipeText prompt={template} showOriginalLanguage />);
    expect(html).toContain('Enable JavaScript');
    expect(html).toContain('adapted from this case');
    expect(html).toContain('Editable template. Set the placeholders above.');
    expect(html).not.toContain('Chinese translation');
    expect(html).not.toContain('Word for word, as published.');
  });

  it('updates repeated tokens and generation text, accepts custom input, and resets', async () => {
    const { container } = render(<><RecipeText prompt={template} /><RecipeGenerateLink prompt={template.prompt}>Generate website</RecipeGenerateLink></>);
    const resolved = () => container.querySelector('[data-prompt]')!.textContent;
    const generated = () => new URL(screen.getByRole('link', { name: 'Generate website' }).getAttribute('href')!).searchParams.get('prompts');
    expect(resolved()).toBe(template.prompt);
    fireEvent.click(screen.getByRole('radio', { name: 'a shop' }));
    expect(resolved()).toBe('Build a shop with a shop.');
    await waitFor(() => expect(generated()).toBe(resolved()));
    fireEvent.click(within(screen.getByRole('radiogroup', { name: '[PROJECT]' })).getByRole('radio', { name: 'Custom' }));
    fireEvent.change(screen.getByRole('textbox', { name: '[PROJECT]' }), { target: { value: '我的网站' } });
    expect(resolved()).toBe('Build 我的网站 with 我的网站.');
    await waitFor(() => expect(generated()).toBe(resolved()));
    fireEvent.click(screen.getByRole('button', { name: 'Reset placeholders' }));
    expect(resolved()).toBe(template.prompt);
    await waitFor(() => expect(generated()).toBe(template.prompt));
  });

  for (const locale of ['en', 'zh-CN'] as const) {
    it(`uses templates for every Website deck case and both detail routes in ${locale}`, () => {
      const catalog = createGitBetaCatalog(locale);
      const entries = websiteEntries(catalog);
      const all = websiteViews(catalog).find(view => view.axis === 'all')!;
      const shell = document.createElement('div');
      shell.innerHTML = renderToStaticMarkup(<WebsiteViewGallery catalog={catalog} view={all} />);
      expect(shell.querySelectorAll('[data-website-case]')).toHaveLength(225);
      for (const entry of entries) {
        const article = shell.querySelector(`[data-website-case="${entry.id}"]`)!;
        expect(article.querySelector('pre.prompt')?.textContent).toBe(websiteEditableTemplate(catalog, entry).prompt);
        expect(article.querySelector('.prompt-placeholder, .ph')).not.toBeNull();
      }
      for (const entry of [entries.find(entry => !entry.promptHref)!, entries.find(entry => entry.id === 'prm_92f371524da72b3bcde64de274448347')!]) {
        const detail = document.createElement('div');
        detail.innerHTML = renderToStaticMarkup(<WebsiteCaseDetail catalog={catalog} entry={entry} />);
        expect(detail.querySelector('[data-prompt]')?.textContent).toBe(websiteEditableTemplate(catalog, entry).prompt);
        expect(detail.querySelectorAll('[role="radiogroup"]').length).toBeGreaterThan(0);
        expect(detail.querySelector('[data-generation-cta]')).not.toBeNull();
        expect(detail.querySelector(`a[href="${entry.source.url}"]`)).not.toBeNull();
      }
      shell.innerHTML = renderToStaticMarkup(<WebsiteGallery catalog={catalog} />);
      for (const view of websiteViews(catalog)) {
        const article = shell.querySelector(`[data-website-deck-view="${view.id}"]`)!;
        expect(article.querySelector('pre.prompt')?.textContent).toBeTruthy();
        expect(article.querySelector('.ph')).not.toBeNull();
      }
      const samples = [entries.find(entry => !entry.promptHref)!, entries.find(entry => entry.promptHref)!];
      const templates = samples.map(entry => ({ entry, prompt: websiteEditableTemplate(catalog, entry) }));
      for (const presentation of ['findings', 'anthology'] as const) {
        shell.innerHTML = renderToStaticMarkup(<WebsiteCaseResults rows={samples} presentation={presentation} topics={{}} uiLocale={locale}
          promptTexts={Object.fromEntries(templates.map(({entry,prompt})=>[entry.id,prompt.prompt]))}
          promptLanguages={Object.fromEntries(templates.map(({entry,prompt})=>[entry.id,prompt.language]))}
          promptTemplateOrigins={Object.fromEntries(templates.map(({entry,prompt})=>[entry.id,prompt.origin]))} />);
        for (const { entry, prompt } of templates) {
          expect(shell.querySelector(`[data-website-case="${entry.id}"] .verbatim, [data-website-case="${entry.id}"] .body .mono`)?.textContent).toBe(prompt.prompt);
        }
        expect(shell.textContent).toContain(locale === 'en' ? 'Site-authored template' : '站点整理模板');
      }
      const prompt = catalog.prompts.find(prompt => entries.some(entry => entry.id === prompt.id || entry.promptHref === prompt.href))!;
      const entry = entries.find(entry => entry.id === prompt.id || entry.promptHref === prompt.href)!;
      shell.innerHTML = renderToStaticMarkup(<Recipe catalog={catalog} prompt={prompt} />);
      expect(shell.querySelector('[data-prompt]')?.textContent).toBe(websiteEditableTemplate(catalog, entry).prompt);
    }, 30_000);
  }
});
