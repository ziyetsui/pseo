import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { createGitBetaCatalog } from '@/lib/catalog/git-beta';
import { Hub } from '@/components/Hub';

describe('approved Chinese homepage', () => {
  it('renders the confirmed 静·文楷 hero in the Chinese typography scope', () => {
    const page = parse(renderToStaticMarkup(<Hub catalog={createGitBetaCatalog('zh-CN')} />));
    expect(page.querySelector('.chinese-type .argument h1')?.text).toBe('早有人写好了。');
    expect(page.querySelector('.argument .body em')?.text).toBe('重新被找到');
    expect(page.querySelector('.argument .body')?.text).toContain('一个好起点，值得被更多人看见。');
  });

  it('keeps the English homepage outside the Chinese typography scope', () => {
    const page = parse(renderToStaticMarkup(<Hub catalog={createGitBetaCatalog('en')} />));
    expect(page.querySelector('.chinese-type')).toBeNull();
    expect(page.querySelector('.argument h1')?.text).toBe('Somebody already wrote this');
  });
});
