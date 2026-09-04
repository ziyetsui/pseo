// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { afterEach, describe, expect, it } from 'vitest';
import { Creators, DeckBrowse, HubBrowse } from '../src/components/Browse';
import { DeckReader } from '../src/components/DeckReader';
import { TaskFindings } from '../src/components/TaskFindings';
import { TaskFindingsReader } from '../src/components/TaskFindingsReader';
import { StylePlateReader } from '../src/components/StylePlateReader';
import { createFixtureCatalog } from '../src/lib/catalog/fixture';
import type { Media } from '../src/lib/catalog/types';

const catalog = createFixtureCatalog('zh-CN');
const prompt = catalog.prompts.find(p => p.useCases.length && p.styles.length && p.models.length)!;
const task = prompt.useCases[0]!, style = prompt.styles[0]!;
const single = { ...catalog, prompts: [prompt] };
const empty = { ...catalog, prompts: [] };
const html = (node: React.ReactNode) => parse(renderToStaticMarkup(node));
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });

describe('collection page parity', () => {
  it('uses structured text detection without misclassifying leading placeholders as JSON', () => {
    const rows = [{ ...prompt, prompt: '[SUBJECT] stands in [LOCATION].' }];
    const page = html(<DeckBrowse catalog={{ ...catalog, prompts: rows }} prompts={rows} />);
    expect(page.querySelector('.ch')?.text).toContain('0 of 1 use structured text');
    expect(page.text).not.toContain('written as JSON');
    const structured = [{ ...prompt, prompt: '{"subject":"[SUBJECT]"}' }];
    expect(html(<DeckBrowse catalog={{ ...catalog, prompts: structured }} prompts={structured} />).querySelector('.ch')?.text)
      .toContain('1 of 1 use structured text');
  });

  it.each([
    ['image', 'image', 'PHOTO'], ['video', 'video', 'VIDEO'], ['image', 'video', 'MEDIA'],
  ] as const)('labels %s/%s media from the assets themselves', (first, second, label) => {
    const media: Media[] = [first, second].map((kind, index) => ({ id: String(index), kind, src: `/media-${index}`, alt: 'Preview', width: null, height: null, poster: null, label: null }));
    // A video prompt can have photo previews; prompt classification must not overwrite the asset label.
    const page = html(<DeckReader catalog={{ ...catalog, prompts: [{ ...prompt, kind: 'video', media }] }} contentType="video" />);
    expect(page.querySelector('.mb')?.text).toBe(`${label} · ×2`);
    expect(page.querySelector('.dcacts a')?.text).toBe('Generate video');
  });

  it.each(['task', 'style'] as const)('gives an actual empty %s a library link without a dead Clear filters action', kind => {
    const node = kind === 'task' ? <TaskFindingsReader catalog={empty} task={task} tasks={[]} /> : <StylePlateReader catalog={empty} style={style} />;
    const page = html(node), state = page.querySelector('.empty')!;
    expect(state.text).toContain('prompts in the library yet.');
    expect(state.querySelector('a')?.getAttribute('href')).toBe('/zh-CN/prompts');
    expect(state.querySelector('button')).toBeNull();
  });

  it.each(['task', 'style'] as const)('clears filters within a populated %s and keeps its scope', kind => {
    const path = `/zh-CN/prompts/${kind === 'task' ? 'use-cases' : 'styles'}/${kind === 'task' ? task.slug : style.slug}`;
    window.history.replaceState(null, '', `${path}?q=not-a-real-prompt-xyz`);
    const view = render(kind === 'task' ? <TaskFindingsReader catalog={single} task={task} tasks={[task]} /> : <StylePlateReader catalog={single} style={style} />);
    const state = view.container.querySelector('.empty')!;
    expect(state.textContent).toContain('matches those filters');
    fireEvent.click(state.querySelector('button')!);
    expect(window.location.pathname).toBe(path);
    expect(window.location.search).toBe('');
    expect(view.container.querySelector('.empty')).toBeNull();
    expect(view.container.querySelector('[data-prompt-id]')?.getAttribute('data-prompt-id')).toBe(prompt.id);
  });

  it('uses singular counts in every shared browse and task surface', () => {
    const browse = html(<HubBrowse catalog={single} horizontalNavigation />);
    for (const count of browse.querySelectorAll('.tile .tb p')) expect(count.text).not.toBe('1 prompts');
    const taskPage = html(<TaskFindingsReader catalog={single} task={task} tasks={[task]} />);
    expect(taskPage.text).toContain('1 prompt this task holds');
    expect(taskPage.text).not.toContain('1 prompts');
  });

  it('shows the same referenced creator in shared cards, task cards, and the deck even without a handle', () => {
    const creator = catalog.creators[0]!;
    const row = { ...prompt, handle: '', creatorRef: { id: creator.id, slug: creator.slug, label: creator.label } };
    const source = { ...catalog, prompts: [row] };
    for (const page of [html(<Creators catalog={source} />), html(<TaskFindings catalog={source} task={task} />)]) {
      expect(page.querySelector('#creators .person')?.getAttribute('href')).toBe(creator.url || creator.href);
      expect(page.querySelector('#creators .person')?.text).toContain('1 prompt');
    }
    if (creator.avatarUrl) expect(html(<DeckReader catalog={source} contentType="image" />).querySelector('.meta img.av')?.getAttribute('src')).toBe(creator.avatarUrl);
  });
});
