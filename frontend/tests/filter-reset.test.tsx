// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePromptExplorer } from '../src/components/Filters';
import { createFixtureCatalog } from '../src/lib/catalog/fixture';

const catalog = createFixtureCatalog('zh-CN');
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });

describe('shared time-window filter reset', () => {
  it.each(['7d', '30d'])('recognizes and clears window=%s while preserving sort and the fixed page scope', windowValue => {
    const pathname = '/zh-CN/prompts/use-cases/beauty';
    window.history.replaceState(null, '', `${pathname}?window=${windowValue}&sort=value`);
    const fixed = { ...catalog, observedAt: '2026-09-30', prompts: catalog.prompts.filter(prompt => prompt.useCases.some(ref => ref.slug === 'beauty')) };
    const { result } = renderHook(() => usePromptExplorer(fixed));
    expect(result.current.rows).toHaveLength(0);
    expect(result.current.active).toBe(true);
    act(() => result.current.clear());
    expect(window.location.pathname).toBe(pathname);
    expect(window.location.search).toBe('?sort=value');
    expect(result.current.rows).toHaveLength(fixed.prompts.length);
    expect(result.current.active).toBe(false);
  });
});
