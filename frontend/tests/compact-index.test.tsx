// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { CompactIndex } from '@/components/CompactIndex';
afterEach(cleanup);
const entries = (n:number, prefix='e') => Array.from({length:n},(_,i)=><li key={`${prefix}-${i}`}><a href={`#${prefix}-${i}`}>Entry {i+1}</a></li>);
describe('compact page indexes',()=>{
 it('keeps twelve links upfront and all remaining links in a native closed disclosure',()=>{
  const {container}=render(<CompactIndex uiLocale="en" className="toc" label="Index">{entries(30)}</CompactIndex>);
  expect(container.querySelector('.index-preview')?.children).toHaveLength(12);
  expect(container.querySelectorAll('a')).toHaveLength(30);
  const more=container.querySelector('details')!;expect(more.open).toBe(false);
  expect(more.querySelector('ol')?.start).toBe(13);
  fireEvent.click(more.querySelector('summary')!);expect(more.open).toBe(true);
  fireEvent.click(more.querySelector('summary')!);expect(more.open).toBe(false);
 });
 it('does not offer an empty expansion and localizes the control',()=>{
  const view=render(<CompactIndex uiLocale="zh-CN" label="目录">{entries(12)}</CompactIndex>);
  expect(view.container.querySelector('details')).toBeNull();
  view.rerender(<CompactIndex uiLocale="zh-CN" label="目录">{entries(13)}</CompactIndex>);
  expect(view.container.querySelector('summary')?.textContent).toContain('查看全部 13 项');
 });
 it('collapses when filtering changes entries, including equal-sized results',()=>{
  const view=render(<CompactIndex uiLocale="en" label="Index">{entries(20)}</CompactIndex>);
  fireEvent.click(view.container.querySelector('summary')!);expect(view.container.querySelector('details')?.open).toBe(true);
  view.rerender(<CompactIndex uiLocale="en" label="Index">{entries(20,'other')}</CompactIndex>);
  expect(view.container.querySelector('details')?.open).toBe(false);
  expect(view.container.querySelector('a')?.getAttribute('href')).toBe('#other-0');
 });
});
